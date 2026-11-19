"""
ProctorLens-AI: Core Computer Vision & Behavioral Auditing Engine
================================================================
Implements real-time webcam frame analysis using OpenCV and MediaPipe Face Mesh:
1. 3D Head Pose Estimation (SolvePnP with facial landmarks -> Pitch, Yaw, Roll)
2. Attention & Gaze Violation Tracking (> 1.5s persistent deflection threshold)
3. Candidate Presence & Multi-Person Intrusion Checks
4. Dynamic Trust Score Calculation (-2 for looking away, -5/s for absence, -15 for multiple faces)
5. Automated High-Severity Snapshot Evidence Capture with visual audit overlays
"""

import os
import time
import uuid
import base64
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
import cv2
import numpy as np

# MediaPipe safe import with graceful fallback
try:
    import mediapipe as mp
    mp_face_mesh = mp.solutions.face_mesh
    MEDIAPIPE_AVAILABLE = True
except (ImportError, AttributeError):
    mp = None
    mp_face_mesh = None
    MEDIAPIPE_AVAILABLE = False


class ProctorEngine:
    """
    Core proctoring engine for evaluating exam candidate integrity via video stream.
    """

    # 3D Anthropometric Model Points for head pose estimation (in mm relative to nose tip)
    DEFAULT_3D_MODEL_POINTS = np.array([
        (0.0, 0.0, 0.0),             # 1: Nose tip
        (0.0, -330.0, -65.0),        # 152: Chin
        (-225.0, 170.0, -135.0),     # 33: Left eye outer corner
        (225.0, 170.0, -135.0),      # 263: Right eye outer corner
        (-150.0, -150.0, -125.0),    # 61: Left mouth corner
        (150.0, -150.0, -125.0),     # 291: Right mouth corner
        (-300.0, 50.0, -200.0),      # 234: Left ear/tragus region
        (300.0, 50.0, -200.0)        # 454: Right ear/tragus region
    ], dtype=np.float64)

    # Corresponding MediaPipe FaceMesh landmark indices
    LANDMARK_INDICES = [1, 152, 33, 263, 61, 291, 234, 454]

    def __init__(
        self,
        evidence_dir: Optional[str] = None,
        initial_trust_score: float = 100.0,
        max_faces: int = 4,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
        looking_away_threshold_deg: float = 25.0,
        looking_away_duration_sec: float = 1.5,
        clean_recovery_rate_per_sec: float = 0.2
    ):
        self.initial_trust_score = float(initial_trust_score)
        self.trust_score = float(initial_trust_score)
        self.incidents: List[Dict[str, Any]] = []
        self.warnings_count = {
            "total": 0,
            "voice": 0,
            "mobile_phone": 0,
            "tab_switch": 0,
            "fullscreen_exit": 0,
            "looking_away": 0,
            "multiple_faces": 0,
            "no_face": 0,
            "window_backlight": 0,
            "head_nodding": 0,
            "partial_face": 0
        }

        # Detection Thresholds
        self.looking_away_threshold_deg = looking_away_threshold_deg
        self.looking_away_duration_sec = looking_away_duration_sec
        self.clean_recovery_rate_per_sec = clean_recovery_rate_per_sec

        # State tracking for continuous violations
        self.looking_away_start_time: Optional[float] = None
        self.last_looking_away_penalty_time: float = 0.0

        self.no_face_start_time: Optional[float] = None
        self.last_no_face_penalty_time: float = 0.0

        self.last_multi_face_penalty_time: float = 0.0
        self.last_mobile_penalty_time: float = 0.0
        self.last_tab_penalty_time: float = 0.0
        self.last_voice_penalty_time: float = 0.0
        self.last_lighting_penalty_time: float = 0.0
        self.last_boundary_penalty_time: float = 0.0
        self.last_nodding_penalty_time: float = 0.0
        self.last_clean_timestamp: float = time.time()

        # Head nodding temporal tracking: rolling list of (timestamp, pitch)
        self.pitch_history: List[Tuple[float, float]] = []

        # Mobile phone detection: requires candidate present + hand proximity + 2 consecutive frames
        self.phone_consecutive_frames: int = 0
        self.phone_confirm_threshold: int = 2

        # Multiple persons detection: requires 3 consecutive frames of 2+ faces to prevent single-frame flicker
        self.multi_face_consecutive_frames: int = 0
        self.multi_face_confirm_threshold: int = 3

        # Evidence snapshot directory
        if evidence_dir is None:
            base_path = Path(__file__).resolve().parent
            self.evidence_dir = base_path / "evidence"
        else:
            self.evidence_dir = Path(evidence_dir)
        self.evidence_dir.mkdir(parents=True, exist_ok=True)

        # Initialize Haar Cascade face detectors as dependable computer vision ensemble
        try:
            haar_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            self.haar_face = cv2.CascadeClassifier(haar_path)
            alt2_path = cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml"
            self.haar_face_alt2 = cv2.CascadeClassifier(alt2_path)
        except Exception:
            self.haar_face = None
            self.haar_face_alt2 = None

        # Initialize MediaPipe Face Mesh detector
        if MEDIAPIPE_AVAILABLE and mp_face_mesh:
            self.face_mesh = mp_face_mesh.FaceMesh(
                static_image_mode=False,
                max_num_faces=max_faces,
                refine_landmarks=True,
                min_detection_confidence=min_detection_confidence,
                min_tracking_confidence=min_tracking_confidence
            )
        else:
            self.face_mesh = None

    # -------------------------------------------------------------------------
    # Image Utility Functions
    # -------------------------------------------------------------------------
    def decode_base64_image(self, base64_str: str) -> Optional[np.ndarray]:
        """
        Decodes a base64 encoded data URI or raw base64 string into an OpenCV BGR numpy array.
        """
        try:
            if "," in base64_str:
                base64_str = base64_str.split(",", 1)[1]
            img_bytes = base64.b64decode(base64_str)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            return img
        except Exception as err:
            print(f"[ProctorEngine] Failed to decode base64 frame: {err}")
            return None

    def encode_image_to_base64(self, image: np.ndarray, quality: int = 75) -> str:
        """
        Encodes an OpenCV image to JPEG format base64 string (with data URI prefix).
        """
        success, buffer = cv2.imencode(".jpg", image, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
        if not success:
            return ""
        encoded = base64.b64encode(buffer).decode("utf-8")
        return f"data:image/jpeg;base64,{encoded}"

    # -------------------------------------------------------------------------
    # 3D Head Pose Estimation
    # -------------------------------------------------------------------------
    def estimate_head_pose(
        self,
        landmarks,
        img_w: int,
        img_h: int
    ) -> Tuple[float, float, float]:
        """
        Computes 3D head orientation (Pitch, Yaw, Roll) in degrees using Perspective-n-Point (solvePnP).

        Args:
            landmarks: MediaPipe normalized facial landmarks collection.
            img_w: Frame width in pixels.
            img_h: Frame height in pixels.

        Returns:
            Tuple of (pitch, yaw, roll) in degrees:
            - Pitch: head tilting up/down (positive = down, negative = up)
            - Yaw: head panning left/right (positive = turned right, negative = turned left)
            - Roll: head tilting sideways (positive = tilted right, negative = tilted left)
        """
        image_points = []
        for idx in self.LANDMARK_INDICES:
            lm = landmarks[idx]
            image_points.append([float(lm.x * img_w), float(lm.y * img_h)])

        image_points = np.array(image_points, dtype=np.float64)

        # Approximate camera intrinsic matrix assuming focal length ~= image width
        focal_length = float(img_w)
        center_x, center_y = float(img_w / 2.0), float(img_h / 2.0)
        camera_matrix = np.array([
            [focal_length, 0.0, center_x],
            [0.0, focal_length, center_y],
            [0.0, 0.0, 1.0]
        ], dtype=np.float64)

        dist_coeffs = np.zeros((4, 1), dtype=np.float64)

        # Solve for rotation and translation vectors
        success, rot_vec, trans_vec = cv2.solvePnP(
            self.DEFAULT_3D_MODEL_POINTS,
            image_points,
            camera_matrix,
            dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE
        )

        if not success:
            return 0.0, 0.0, 0.0

        # Convert rotation vector to 3x3 rotation matrix
        rot_mat, _ = cv2.Rodrigues(rot_vec)

        # Decompose projection matrix to extract standard Euler angles
        proj_matrix = np.hstack((rot_mat, trans_vec))
        _, _, _, _, _, _, euler_angles = cv2.decomposeProjectionMatrix(proj_matrix)

        pitch = float(euler_angles[0][0])
        yaw = float(euler_angles[1][0])
        roll = float(euler_angles[2][0])

        # Normalize angles to range [-180, 180]
        pitch = ((pitch + 180.0) % 360.0) - 180.0
        yaw = ((yaw + 180.0) % 360.0) - 180.0
        roll = ((roll + 180.0) % 360.0) - 180.0

        return round(pitch, 2), round(yaw, 2), round(roll, 2)

    # -------------------------------------------------------------------------
    # Lighting & Window Backlight Assessment
    # -------------------------------------------------------------------------
    def check_lighting_and_backlight(
        self,
        frame: np.ndarray,
        face_box: Tuple[int, int, int, int]
    ) -> Optional[Dict[str, Any]]:
        """
        Detects if the candidate is seated in front of a bright window (backlight / silhouette)
        or if lighting is too low to properly recognize facial features.
        """
        try:
            h, w, _ = frame.shape
            fx, fy, fw, fh = face_box
            fx1, fy1 = max(0, fx), max(0, fy)
            fx2, fy2 = min(w, fx + fw), min(h, fy + fh)
            if fx2 <= fx1 or fy2 <= fy1:
                return None

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            face_roi = gray[fy1:fy2, fx1:fx2]
            if face_roi.size == 0:
                return None

            face_mean = float(np.mean(face_roi))

            # Sample periphery background outside face box
            bg_mask = np.ones((h, w), dtype=bool)
            bg_mask[fy1:fy2, fx1:fx2] = False
            bg_pixels = gray[bg_mask]
            bg_mean = float(np.mean(bg_pixels)) if bg_pixels.size > 0 else 128.0

            # 1. Severe Window Backlight (silhouette face caused by bright window behind)
            if (bg_mean >= 135.0 and face_mean <= 68.0) or (bg_mean >= 155.0 and (bg_mean / max(1.0, face_mean)) >= 2.0):
                return {
                    "code": "WINDOW_BACKLIGHT_SHADOW",
                    "severity": "HIGH",
                    "message": f"Window backlight detected! Background is bright ({bg_mean:.0f}) while face is dark ({face_mean:.0f}). Please close window curtains or face the light."
                }

            # 2. Deficient Facial Illumination (room too dark)
            if face_mean < 35.0:
                return {
                    "code": "POOR_FACIAL_LIGHTING",
                    "severity": "HIGH",
                    "message": f"Poor facial illumination detected (Face luminance: {face_mean:.0f}/255). Please ensure adequate lighting on your face."
                }

            return None
        except Exception:
            return None

    # -------------------------------------------------------------------------
    # Half-Face & Camera Region Boundary Check
    # -------------------------------------------------------------------------
    def check_face_boundary_and_partial(
        self,
        landmarks,
        face_box: Tuple[int, int, int, int],
        img_w: int,
        img_h: int
    ) -> Optional[Dict[str, Any]]:
        """
        Detects if face is outside the central camera proctor zone, clipped by frame edges,
        or only half of the face is visible.
        """
        try:
            fx, fy, fw, fh = face_box
            margin = 14

            # 1. Edge clipping (face boundary touching webcam frame edges)
            if fx <= margin or (fx + fw) >= (img_w - margin):
                side = "left" if fx <= margin else "right"
                return {
                    "code": "PARTIAL_FACE_DETECTED",
                    "severity": "HIGH",
                    "message": f"Half face detected! Face is cut off at the {side} edge of camera view. Center your full face."
                }

            if fy <= margin or (fy + fh) >= (img_h - margin):
                side = "top" if fy <= margin else "bottom"
                return {
                    "code": "PARTIAL_FACE_DETECTED",
                    "severity": "HIGH",
                    "message": f"Partial face detected! Face is clipped at the {side} edge of camera view. Adjust camera angle."
                }

            # 2. Center Proctor Zone Check (Face center should stay within central region)
            face_cx = fx + fw / 2.0
            face_cy = fy + fh / 2.0
            if face_cx < 0.16 * img_w or face_cx > 0.84 * img_w or face_cy < 0.12 * img_h or face_cy > 0.88 * img_h:
                return {
                    "code": "FACE_OUT_OF_PROCTOR_ZONE",
                    "severity": "HIGH",
                    "message": "Face out of center camera region! Please remain centered in the designated camera proctor zone."
                }

            # 3. Asymmetric half-face landmark ratio check
            if landmarks and len(landmarks) > 263:
                left_eye_x = landmarks[33].x * img_w
                right_eye_x = landmarks[263].x * img_w
                nose_x = landmarks[1].x * img_w
                eye_dist = abs(right_eye_x - left_eye_x)

                # Profile view check (only half face showing)
                if fw > 35 and (eye_dist / fw) < 0.28:
                    return {
                        "code": "HALF_FACE_PROFILE",
                        "severity": "HIGH",
                        "message": "Only half face visible! Side profile detected. Please face the webcam directly."
                    }

                # Nose off-center ratio check
                if eye_dist > 20:
                    min_eye = min(left_eye_x, right_eye_x)
                    nose_pos = (nose_x - min_eye) / eye_dist
                    if nose_pos < 0.12 or nose_pos > 0.88:
                        return {
                            "code": "HALF_FACE_TURNED",
                            "severity": "HIGH",
                            "message": "Significant portion of face is obscured or turned away. Keep full frontal face in frame."
                        }

            return None
        except Exception:
            return None

    # -------------------------------------------------------------------------
    # Head Nodding & Pitch Oscillation Tracker
    # -------------------------------------------------------------------------
    def check_head_nodding(self, timestamp: float, pitch: float) -> Optional[Dict[str, Any]]:
        """
        Tracks vertical head pitch over a 3.5s rolling window to detect nodding
        or repeated downward desk/lap glancing.
        """
        try:
            self.pitch_history.append((timestamp, pitch))
            # Keep history within last 3.5 seconds
            self.pitch_history = [(t, p) for (t, p) in self.pitch_history if (timestamp - t) <= 3.5]

            if len(self.pitch_history) < 4:
                return None

            # 1. Check sustained downward glancing (looking down at desk/lap)
            recent_pitches = [p for (t, p) in self.pitch_history if (timestamp - t) <= 2.0]
            if recent_pitches and sum(1 for p in recent_pitches if p > 18.0) >= max(3, int(len(recent_pitches) * 0.75)):
                return {
                    "code": "HEAD_NODDING_OR_LOOKING_DOWN",
                    "severity": "HIGH",
                    "message": "Persistent downward head tilt / looking down at desk detected. Keep your head upright facing screen."
                }

            # 2. Check oscillatory nodding (multiple direction reversals with amplitude >= 8°)
            pitches = [p for (t, p) in self.pitch_history]
            reversals = 0
            for i in range(1, len(pitches) - 1):
                d1 = pitches[i] - pitches[i - 1]
                d2 = pitches[i + 1] - pitches[i]
                if (d1 * d2 < 0) and abs(pitches[i] - pitches[i - 1]) >= 8.0:
                    reversals += 1

            if reversals >= 2:
                return {
                    "code": "HEAD_NODDING_DETECTED",
                    "severity": "HIGH",
                    "message": "Repeated head nodding detected. Maintain steady head focus toward the screen."
                }

            return None
        except Exception:
            return None

    # -------------------------------------------------------------------------
    # Snapshot Evidence Capture
    # -------------------------------------------------------------------------
    def capture_evidence_snapshot(
        self,
        frame: np.ndarray,
        infraction_code: str,
        severity: str,
        message: str,
        head_pose: Dict[str, float],
        face_count: int,
        timestamp: float
    ) -> Dict[str, Any]:
        """
        Renders audit metadata banner onto frame and saves JPEG snapshot to disk.
        Returns the saved file path and base64 preview representation.
        """
        evidence_frame = frame.copy()
        h, w, _ = evidence_frame.shape

        # Render evidence watermark banner on the snapshot
        banner_h = 60
        overlay = evidence_frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, banner_h), (15, 23, 42), -1)
        cv2.addWeighted(overlay, 0.85, evidence_frame, 0.15, 0, evidence_frame)

        color_map = {
            "CRITICAL": (68, 68, 239),   # Red / Rose (BGR)
            "HIGH": (0, 140, 255),       # Orange
            "MEDIUM": (0, 215, 255)      # Amber/Yellow
        }
        badge_color = color_map.get(severity, (255, 100, 100))

        # Text labels
        time_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(timestamp))
        cv2.putText(evidence_frame, f"PROCTORLENS-AI EVIDENCE | {infraction_code}", (12, 22),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, badge_color, 2, cv2.LINE_AA)
        cv2.putText(evidence_frame, f"{time_str} | Trust Score: {self.trust_score:.1f}% | Faces: {face_count}",
                    (12, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (220, 220, 220), 1, cv2.LINE_AA)

        # Unique filename
        unique_id = uuid.uuid4().hex[:8]
        filename = f"incident_{int(timestamp)}_{infraction_code}_{unique_id}.jpg"
        file_path = self.evidence_dir / filename

        try:
            cv2.imwrite(str(file_path), evidence_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        except Exception as e:
            print(f"[ProctorEngine] Failed to write evidence snapshot to {file_path}: {e}")

        # Generate base64 thumbnail for instant UI display
        base64_data = self.encode_image_to_base64(evidence_frame, quality=70)

        return {
            "snapshot_path": str(file_path),
            "snapshot_filename": filename,
            "snapshot_base64": base64_data
        }

    # -------------------------------------------------------------------------
    # Main Behavioral Analysis Loop
    # -------------------------------------------------------------------------
    def analyze_frame(
        self,
        frame: np.ndarray,
        snapshot_base64: Optional[str] = None,
        current_time: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Analyzes a single video frame for presence, multi-person intrusion, and gaze deflection.

        Args:
            frame: OpenCV BGR image numpy array.
            snapshot_base64: Optional raw client base64 string.
            current_time: Optional epoch timestamp for testing or sync.

        Returns:
            Dictionary containing timestamp, face_count, head_pose, infractions list,
            trust_score, and audit status.
        """
        timestamp = current_time if current_time is not None else time.time()
        time_display = time.strftime("%H:%M:%S", time.localtime(timestamp))
        h, w, _ = frame.shape

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_count = 0
        head_pose = {"pitch": 0.0, "yaw": 0.0, "roll": 0.0}
        infractions: List[Dict[str, Any]] = []

        face_boxes = []
        results = None
        # Run MediaPipe face mesh if available
        if self.face_mesh:
            results = self.face_mesh.process(rgb_frame)
            if results.multi_face_landmarks:
                face_count = len(results.multi_face_landmarks)
                for fl in results.multi_face_landmarks:
                    xs = [lm.x * w for lm in fl.landmark]
                    ys = [lm.y * h for lm in fl.landmark]
                    min_x, max_x = int(min(xs)), int(max(xs))
                    min_y, max_y = int(min(ys)), int(max(ys))
                    face_boxes.append((min_x, min_y, max_x - min_x, max_y - min_y))

        # Secondary: High-accuracy Haar Cascade ensemble detector
        if self.haar_face and not self.haar_face.empty():
            gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            detected_faces = list(self.haar_face.detectMultiScale(
                gray_frame,
                scaleFactor=1.1,
                minNeighbors=3,
                minSize=(28, 28)
            ))
            # Also check alt2 cascade for secondary / profile faces
            if hasattr(self, 'haar_face_alt2') and self.haar_face_alt2 and not self.haar_face_alt2.empty():
                alt_faces = self.haar_face_alt2.detectMultiScale(
                    gray_frame,
                    scaleFactor=1.08,
                    minNeighbors=2,
                    minSize=(30, 30)
                )
                for (ax, ay, aw, ah) in alt_faces:
                    # Only add if not overlapping with existing detection
                    is_dup = False
                    for (dx, dy, dw, dh) in detected_faces:
                        if abs(ax - dx) < (dw * 0.6) and abs(ay - dy) < (dh * 0.6):
                            is_dup = True
                            break
                    if not is_dup:
                        detected_faces.append((ax, ay, aw, ah))

            if len(detected_faces) > 0:
                # Use cascade result if MediaPipe gave 0 or cascade detected multiple
                if face_count == 0 or len(detected_faces) > face_count:
                    face_count = len(detected_faces)
                    face_boxes = [(fx, fy, fw, fh) for (fx, fy, fw, fh) in detected_faces]
                    if face_count == 1:
                        fx, fy, fw, fh = detected_faces[0]
                        fcx = fx + (fw / 2.0)
                        fcy = fy + (fh / 2.0)
                        yaw_deg = round(((fcx - (w / 2.0)) / (w / 2.0)) * 40.0, 1)
                        pitch_deg = round(((fcy - (h * 0.42)) / (h * 0.42)) * 30.0, 1)
                        head_pose = {"pitch": pitch_deg, "yaw": yaw_deg, "roll": 0.0}

        # ---------------------------------------------------------------------
        # 1. Presence Rule: No Face Detected (-5 pts per second)
        # ---------------------------------------------------------------------
        if face_count == 0:
            if self.no_face_start_time is None:
                self.no_face_start_time = timestamp
                self.last_no_face_penalty_time = timestamp

            absence_duration = timestamp - self.no_face_start_time
            # Apply penalty: -5 pts per second of absence
            elapsed_penalty_time = timestamp - self.last_no_face_penalty_time
            if elapsed_penalty_time >= 1.0:
                seconds_to_charge = int(elapsed_penalty_time)
                deduction = 5.0 * seconds_to_charge
                self.trust_score = max(0.0, self.trust_score - deduction)
                self.last_no_face_penalty_time = timestamp

                msg = f"Candidate absent or camera obstructed for {absence_duration:.1f}s."
                infraction_item = {
                    "code": "NO_FACE_DETECTED",
                    "severity": "HIGH",
                    "message": msg
                }
                infractions.append(infraction_item)

                # Capture evidence snapshot
                evidence = self.capture_evidence_snapshot(
                    frame, "NO_FACE_DETECTED", "HIGH", msg, head_pose, face_count, timestamp
                )
                self._log_incident(
                    "NO_FACE_DETECTED", "HIGH", msg, timestamp, time_display,
                    evidence, head_pose, face_count
                )
        else:
            self.no_face_start_time = None

        # ---------------------------------------------------------------------
        # 2. Presence Rule: Multiple Faces Detected (Requires 3 consecutive frames, 1 warning max for session)
        # ---------------------------------------------------------------------
        if face_count > 1:
            self.multi_face_consecutive_frames += 1
        else:
            self.multi_face_consecutive_frames = 0

        # Require 3 consecutive confirmed frames of 2+ faces to prevent single-frame flicker false alarms
        if self.multi_face_consecutive_frames >= self.multi_face_confirm_threshold:
            msg = f"Multiple individuals detected in camera view ({face_count} faces visible)."
            infraction_item = {
                "code": "MULTIPLE_FACES_DETECTED",
                "severity": "CRITICAL",
                "message": msg
            }
            infractions.append(infraction_item)

            # Strict session rule: 1 warning total for multiple persons across the entire session
            if self.warnings_count["multiple_faces"] < 1:
                self.trust_score = max(0.0, self.trust_score - 15.0)
                self.last_multi_face_penalty_time = timestamp
                self.warnings_count["multiple_faces"] = 1
                self.warnings_count["total"] = min(5, self.warnings_count["total"] + 1)

                evidence = self.capture_evidence_snapshot(
                    frame, "MULTIPLE_FACES_DETECTED", "CRITICAL", msg, head_pose, face_count, timestamp
                )
                self._log_incident(
                    "MULTIPLE_FACES_DETECTED", "CRITICAL", msg, timestamp, time_display,
                    evidence, head_pose, face_count
                )

        # ---------------------------------------------------------------------
        # 3. Head Pose & Attention Rule: Looking Away (>1.5s deflection, -2 pts)
        # ---------------------------------------------------------------------
        if face_count == 1 and self.face_mesh and results.multi_face_landmarks:
            primary_landmarks = results.multi_face_landmarks[0].landmark
            pitch, yaw, roll = self.estimate_head_pose(primary_landmarks, w, h)
            head_pose = {"pitch": pitch, "yaw": yaw, "roll": roll}

            # Check if angles exceed threshold (+/- 25 degrees)
            is_deflected = (
                abs(yaw) > self.looking_away_threshold_deg or
                abs(pitch) > self.looking_away_threshold_deg
            )

            if is_deflected:
                if self.looking_away_start_time is None:
                    self.looking_away_start_time = timestamp

                deflection_duration = timestamp - self.looking_away_start_time

                # Trigger infraction if deflection exceeds 1.5 seconds continuously
                if deflection_duration >= self.looking_away_duration_sec:
                    # Apply -2 pts penalty once per 1.5s deflection cycle
                    if (timestamp - self.last_looking_away_penalty_time) >= self.looking_away_duration_sec:
                        self.trust_score = max(0.0, self.trust_score - 2.0)
                        self.last_looking_away_penalty_time = timestamp

                        direction = "Left" if yaw < -self.looking_away_threshold_deg else (
                            "Right" if yaw > self.looking_away_threshold_deg else (
                                "Down" if pitch > self.looking_away_threshold_deg else "Up"
                            )
                        )
                        msg = f"Candidate looking away ({direction}) for {deflection_duration:.1f}s (Yaw: {yaw}°, Pitch: {pitch}°)."
                        infraction_item = {
                            "code": "LOOKING_AWAY",
                            "severity": "MEDIUM",
                            "message": msg
                        }
                        infractions.append(infraction_item)

                        evidence = self.capture_evidence_snapshot(
                            frame, "LOOKING_AWAY", "MEDIUM", msg, head_pose, face_count, timestamp
                        )
                        self._log_incident(
                            "LOOKING_AWAY", "MEDIUM", msg, timestamp, time_display,
                            evidence, head_pose, face_count
                        )
            else:
                # Reset deflection timer when candidate returns to center
                self.looking_away_start_time = None

            # -----------------------------------------------------------------
            # 4. Head Nodding & Excessive Pitch Oscillation Tracker (-4 pts)
            # -----------------------------------------------------------------
            nodding_infraction = self.check_head_nodding(timestamp, pitch)
            if nodding_infraction and (timestamp - self.last_nodding_penalty_time) >= 3.5:
                self.trust_score = max(0.0, self.trust_score - 4.0)
                self.last_nodding_penalty_time = timestamp
                self.warnings_count["total"] += 1
                self.warnings_count["head_nodding"] += 1
                infractions.append(nodding_infraction)

                evidence = self.capture_evidence_snapshot(
                    frame, nodding_infraction["code"], nodding_infraction["severity"],
                    nodding_infraction["message"], head_pose, face_count, timestamp
                )
                self._log_incident(
                    nodding_infraction["code"], nodding_infraction["severity"],
                    nodding_infraction["message"], timestamp, time_display,
                    evidence, head_pose, face_count
                )

        # ---------------------------------------------------------------------
        # 5. Window Backlight & Poor Facial Lighting Assessment (-5 pts)
        # ---------------------------------------------------------------------
        if face_boxes and (timestamp - self.last_lighting_penalty_time) >= 4.0:
            lighting_infraction = self.check_lighting_and_backlight(frame, face_boxes[0])
            if lighting_infraction:
                self.trust_score = max(0.0, self.trust_score - 5.0)
                self.last_lighting_penalty_time = timestamp
                self.warnings_count["total"] += 1
                self.warnings_count["window_backlight"] += 1
                infractions.append(lighting_infraction)

                evidence = self.capture_evidence_snapshot(
                    frame, lighting_infraction["code"], lighting_infraction["severity"],
                    lighting_infraction["message"], head_pose, face_count, timestamp
                )
                self._log_incident(
                    lighting_infraction["code"], lighting_infraction["severity"],
                    lighting_infraction["message"], timestamp, time_display,
                    evidence, head_pose, face_count
                )

        # ---------------------------------------------------------------------
        # 6. Half-Face & Camera Region Boundary Check (-5 pts)
        # ---------------------------------------------------------------------
        if face_boxes and (timestamp - self.last_boundary_penalty_time) >= 3.0:
            lms = results.multi_face_landmarks[0].landmark if (results and results.multi_face_landmarks) else None
            boundary_infraction = self.check_face_boundary_and_partial(lms, face_boxes[0], w, h)
            if boundary_infraction:
                self.trust_score = max(0.0, self.trust_score - 5.0)
                self.last_boundary_penalty_time = timestamp
                self.warnings_count["total"] += 1
                self.warnings_count["partial_face"] += 1
                infractions.append(boundary_infraction)

                evidence = self.capture_evidence_snapshot(
                    frame, boundary_infraction["code"], boundary_infraction["severity"],
                    boundary_infraction["message"], head_pose, face_count, timestamp
                )
                self._log_incident(
                    boundary_infraction["code"], boundary_infraction["severity"],
                    boundary_infraction["message"], timestamp, time_display,
                    evidence, head_pose, face_count
                )

        # ---------------------------------------------------------------------
        # 7. Mobile Phone & Handheld Device Detection (Hand proximity required, max 2 warnings for session)
        # ---------------------------------------------------------------------
        raw_phone_seen = self.detect_mobile_phone_heuristic(frame, face_boxes=face_boxes, candidate_present=(face_count >= 1))
        if raw_phone_seen:
            self.phone_consecutive_frames += 1
        else:
            self.phone_consecutive_frames = max(0, self.phone_consecutive_frames - 1)

        # Require 2 consecutive confirmed frames of handheld phone
        if self.phone_consecutive_frames >= self.phone_confirm_threshold:
            msg = "Mobile phone detected in hand! Please keep your phone aside and maintain exam integrity."
            infraction_item = {
                "code": "MOBILE_PHONE_DETECTED",
                "severity": "CRITICAL",
                "message": msg
            }
            infractions.append(infraction_item)

            # Strict session rule: max 2 total mobile warnings across session, with 20s cooldown lock
            if (timestamp - self.last_mobile_penalty_time) >= 20.0 and self.warnings_count["mobile_phone"] < 2:
                self.trust_score = max(0.0, self.trust_score - 20.0)
                self.last_mobile_penalty_time = timestamp
                self.warnings_count["mobile_phone"] += 1
                self.warnings_count["total"] = min(5, self.warnings_count["total"] + 1)

                evidence = self.capture_evidence_snapshot(
                    frame, "MOBILE_PHONE_DETECTED", "CRITICAL", msg, head_pose, face_count, timestamp
                )
                self._log_incident(
                    "MOBILE_PHONE_DETECTED", "CRITICAL", msg, timestamp, time_display,
                    evidence, head_pose, face_count
                )

        # ---------------------------------------------------------------------
        # 5. Clean Frame Score Recovery
        # ---------------------------------------------------------------------
        if not infractions and face_count == 1:
            dt = max(0.0, timestamp - self.last_clean_timestamp)
            if self.trust_score < self.initial_trust_score and dt > 0.5:
                recovery = min(
                    self.initial_trust_score - self.trust_score,
                    self.clean_recovery_rate_per_sec * dt
                )
                self.trust_score = round(self.trust_score + recovery, 2)
        self.last_clean_timestamp = timestamp

        self.trust_score = round(max(0.0, min(100.0, self.trust_score)), 1)

        return {
            "timestamp": timestamp,
            "face_count": face_count,
            "head_pose": head_pose,
            "infractions": infractions,
            "trust_score": self.trust_score,
            "warnings_count": self.warnings_count,
            "status": "FLAGGED" if infractions else "CLEAN"
        }

    def _log_incident(
        self,
        code: str,
        severity: str,
        message: str,
        timestamp: float,
        time_display: str,
        evidence: Dict[str, Any],
        head_pose: Dict[str, float],
        face_count: int
    ):
        """Append incident record to in-memory audit log."""
        record = {
            "id": f"inc-{int(timestamp * 1000)}-{len(self.incidents) + 1}",
            "timestamp": timestamp,
            "time_display": time_display,
            "code": code,
            "severity": severity,
            "message": message,
            "snapshot": evidence.get("snapshot_base64"),
            "snapshot_path": evidence.get("snapshot_path"),
            "snapshot_filename": evidence.get("snapshot_filename"),
            "trust_score": self.trust_score,
            "head_pose": head_pose,
            "face_count": face_count
        }
        self.incidents.insert(0, record)
        # Cap stored incident history in memory to last 100 items
        if len(self.incidents) > 100:
            self.incidents.pop()

    def detect_mobile_phone_heuristic(self, frame: np.ndarray, face_boxes=None, candidate_present: bool = True) -> bool:
        """
        High-accuracy precision computer vision detector for handheld smartphones and mobile devices.
        Detects genuine handheld rectangular phone bodies while strictly ignoring background room walls,
        doors, posters, shadows, books, monitors, and empty rooms.

        Requires:
        1. Candidate present in webcam view.
        2. Rectangular body matching modern smartphone form factor (aspect ratio 1.20 - 3.0, area 1200 - 75000 px).
        3. Hand / finger skin contact / overlap (skin_in_border + skin_inside >= 35 pixels).
        4. Excludes eyeglasses and background ceiling fixtures.
        """
        try:
            # If no candidate is present in camera view, ignore background room objects
            if not candidate_present:
                return False

            h, w, _ = frame.shape

            # Segment human skin tones using both YCrCb and HSV color spaces
            ycrcb = cv2.cvtColor(frame, cv2.COLOR_BGR2YCrCb)
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            skin_ycrcb = cv2.inRange(ycrcb, np.array([0, 133, 77]), np.array([255, 175, 127]))
            skin_hsv = cv2.inRange(hsv, np.array([0, 28, 40]), np.array([28, 210, 255]))
            skin_mask = cv2.bitwise_or(skin_ycrcb, skin_hsv)

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            blur = cv2.GaussianBlur(gray, (5, 5), 0)

            # Dual-threshold Canny edge isolation for varied webcam exposures and hand grips
            for t_low, t_high in [(35, 110), (25, 80)]:
                edges = cv2.Canny(blur, t_low, t_high)
                kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
                closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
                cnts, _ = cv2.findContours(closed, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

                for cnt in cnts:
                    area = cv2.contourArea(cnt)
                    # True smartphone dimensions in standard webcam feed: 1,200 to 75,000 px
                    if not (1200 <= area <= 75000):
                        continue
                    if (area / float(w * h)) > 0.45:
                        continue

                    perimeter = cv2.arcLength(cnt, True)
                    if perimeter <= 0:
                        continue

                    rect = cv2.minAreaRect(cnt)
                    rw, rh = rect[1]
                    long_side = max(rw, rh)
                    short_side = min(rw, rh)
                    if long_side < 35 or short_side < 16:
                        continue

                    aspect_ratio = long_side / short_side
                    # Handheld smartphone aspect ratio (portrait 16:9 ~ 1.77, 20:9 ~ 2.22, angled/foreshortened 1.20 to 3.0)
                    if not (1.20 <= aspect_ratio <= 3.0):
                        continue

                    # Rectangular solidity: allows candidate fingers and hand holding the device edges
                    rect_area = rw * rh
                    solidity = area / rect_area if rect_area > 0 else 0
                    if solidity < 0.52:
                        continue

                    # Bounding center
                    cx, cy = int(rect[0][0]), int(rect[0][1])
                    # Ignore extreme ceiling fixture band
                    if cy < int(h * 0.08):
                        continue

                    # Disregard small eyeglasses frames on detected candidate face
                    if face_boxes:
                        is_eye_glasses = False
                        for (fx, fy, fw, fh) in face_boxes:
                            if fx <= cx <= (fx + fw) and fy <= cy <= (fy + int(fh * 0.7)):
                                if area < 3000:
                                    is_eye_glasses = True
                                    break
                        if is_eye_glasses:
                            continue

                    # -------------------------------------------------------------
                    # Hand-Phone Proximity Verification (Crucial Anti-False-Positive)
                    # -------------------------------------------------------------
                    # Create contour mask and dilate by 21px to sample the hand grip / finger contact region
                    mask_cnt = np.zeros((h, w), dtype=np.uint8)
                    cv2.drawContours(mask_cnt, [cnt], -1, 255, -1)
                    dilated = cv2.dilate(mask_cnt, np.ones((21, 21), np.uint8), iterations=1)
                    border = cv2.bitwise_xor(dilated, mask_cnt)

                    skin_in_border = cv2.countNonZero(cv2.bitwise_and(skin_mask, skin_mask, mask=border))
                    skin_inside = cv2.countNonZero(cv2.bitwise_and(skin_mask, skin_mask, mask=mask_cnt))

                    # Handheld rule: Must be in physical contact with or overlapping human skin (fingers/hand grip)
                    # Background rectangles (monitors, blank walls, desk edges) have 0 skin contact!
                    if (skin_in_border + skin_inside) >= 35:
                        return True

            return False
        except Exception:
            return False

    def log_external_violation(
        self,
        violation_type: str,
        message: str,
        snapshot_base64: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Logs security infractions originating outside the CV loop:
        - TAB_SWITCH_DETECTED
        - FULLSCREEN_EXITED
        - VOICE_DETECTED
        - MOBILE_PHONE_DETECTED

        Applies strict debouncing and session limits so strikes reliably count up to 5:
        - Tab switch / Fullscreen exit: 4.0s debounce lock
        - Voice: max 1 warning total for the session with 20s cooldown
        - Total strikes strictly capped at 5
        """
        timestamp = time.time()
        time_display = time.strftime("%H:%M:%S", time.localtime(timestamp))

        # 1. Debounce and cooldown locks
        if violation_type in ("TAB_SWITCH_DETECTED", "FULLSCREEN_EXITED"):
            # Prevent simultaneous blur + visibilitychange + fullscreenchange double-firing
            if (timestamp - self.last_tab_penalty_time) < 4.0:
                return {
                    "status": "DEBOUNCED",
                    "trust_score": self.trust_score,
                    "warnings_count": self.warnings_count
                }
            self.last_tab_penalty_time = timestamp

        elif violation_type == "VOICE_DETECTED":
            # Strict rule: severe noise is 1 warning total for session with 20s cooldown
            if self.warnings_count["voice"] >= 1 or (timestamp - self.last_voice_penalty_time) < 20.0:
                return {
                    "status": "LOCKED",
                    "trust_score": self.trust_score,
                    "warnings_count": self.warnings_count
                }
            self.last_voice_penalty_time = timestamp

        severity_map = {
            "TAB_SWITCH_DETECTED": ("CRITICAL", 10.0, "tab_switch"),
            "FULLSCREEN_EXITED": ("CRITICAL", 10.0, "fullscreen_exit"),
            "VOICE_DETECTED": ("HIGH", 5.0, "voice"),
            "MOBILE_PHONE_DETECTED": ("CRITICAL", 20.0, "mobile_phone")
        }

        severity, penalty, warning_key = severity_map.get(
            violation_type, ("MEDIUM", 5.0, "total")
        )

        self.trust_score = max(0.0, self.trust_score - penalty)

        # Track warning count, strictly capped at 5
        if self.warnings_count["total"] < 5:
            self.warnings_count["total"] = min(5, self.warnings_count["total"] + 1)
            if warning_key in self.warnings_count:
                self.warnings_count[warning_key] += 1

        evidence = {
            "snapshot_base64": snapshot_base64,
            "snapshot_path": None,
            "snapshot_filename": None
        }

        # If a snapshot frame is provided, write it to evidence dir
        if snapshot_base64:
            decoded = self.decode_base64_image(snapshot_base64)
            if decoded is not None:
                evidence = self.capture_evidence_snapshot(
                    decoded, violation_type, severity, message,
                    {"pitch": 0, "yaw": 0, "roll": 0}, 1, timestamp
                )

        record = {
            "id": f"inc-{int(timestamp * 1000)}-{len(self.incidents) + 1}",
            "timestamp": timestamp,
            "time_display": time_display,
            "code": violation_type,
            "severity": severity,
            "message": message,
            "snapshot": evidence.get("snapshot_base64"),
            "snapshot_path": evidence.get("snapshot_path"),
            "snapshot_filename": evidence.get("snapshot_filename"),
            "trust_score": self.trust_score,
            "head_pose": {"pitch": 0, "yaw": 0, "roll": 0},
            "face_count": 1
        }
        self.incidents.insert(0, record)
        if len(self.incidents) > 100:
            self.incidents.pop()

        return {
            "status": "LOGGED",
            "trust_score": self.trust_score,
            "warnings_count": self.warnings_count,
            "incident": record
        }

    def reset_session(self):
        """Reset proctoring session, timers, and restore initial trust score."""
        self.trust_score = self.initial_trust_score
        self.incidents.clear()
        self.warnings_count = {
            "total": 0,
            "voice": 0,
            "mobile_phone": 0,
            "tab_switch": 0,
            "fullscreen_exit": 0,
            "looking_away": 0,
            "multiple_faces": 0,
            "no_face": 0,
            "window_backlight": 0,
            "head_nodding": 0,
            "partial_face": 0
        }
        self.looking_away_start_time = None
        self.last_looking_away_penalty_time = 0.0
        self.no_face_start_time = None
        self.last_no_face_penalty_time = 0.0
        self.last_multi_face_penalty_time = 0.0
        self.last_mobile_penalty_time = 0.0
        self.last_tab_penalty_time = 0.0
        self.last_voice_penalty_time = 0.0
        self.last_lighting_penalty_time = 0.0
        self.last_boundary_penalty_time = 0.0
        self.last_nodding_penalty_time = 0.0
        self.phone_consecutive_frames = 0
        self.multi_face_consecutive_frames = 0
        self.pitch_history.clear()
        self.last_clean_timestamp = time.time()
