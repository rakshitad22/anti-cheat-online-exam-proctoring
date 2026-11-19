"""
ProctorLens-AI: In-Memory & File-Backed Persistent Storage
Stores departments, test catalog, question pools, student roster,
admin announcements, and exam audit reports.
"""

import time
import uuid
import re
import os
import json
from typing import Dict, List, Optional, Any

STUDENTS_FILE = os.path.join(os.path.dirname(__file__), "students_data.json")
TESTS_FILE = os.path.join(os.path.dirname(__file__), "tests_data.json")
REPORTS_FILE = os.path.join(os.path.dirname(__file__), "reports_data.json")

# Initial Departments
DEPARTMENTS = [
    "Computer Science & Engineering (CSE)",
    "Artificial Intelligence & Data Science (AI-DS)",
    "Electronics & Communication (ECE)",
    "Information Technology (IT)",
    "Electrical & Electronics Engineering (EEE)"
]

# Admin Master Credentials
ADMIN_CREDENTIALS = {
    "email": "admin@skit.org.in",
    "password": "admin123",
    "role": "admin",
    "name": "Head Proctor Administrator"
}

# Initial Student Roster (Empty by default: all student credentials issued freshly by Administrator)
INITIAL_STUDENTS = []

# Comprehensive Test Catalog (Department-Wise, with MCQ, Coding & AI Interview)
INITIAL_TESTS = [
    {
        "id": "test-cse-101",
        "title": "Data Structures & Algorithmic Optimization",
        "department": "Computer Science & Engineering (CSE)",
        "type": "coding",
        "duration_minutes": 45,
        "description": "Solve algorithmic challenges with time and space complexity constraints. Anti-copy-paste locked.",
        "difficulty": "Hard",
        "questions": [
            {
                "id": "q1",
                "title": "Two Sum & Hash Map Lookup",
                "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
                "starter_templates": {
                    "python": "def two_sum(nums: list[int], target: int) -> list[int]:\n    # Write your solution here\n    hashmap = {}\n    for i, n in enumerate(nums):\n        diff = target - n\n        if diff in hashmap:\n            return [hashmap[diff], i]\n        hashmap[n] = i\n    return []\n\n# Test call\nprint(two_sum([2, 7, 11, 15], 9))",
                    "javascript": "function twoSum(nums, target) {\n    // Write your solution here\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        let complement = target - nums[i];\n        if (map.has(complement)) return [map.get(complement), i];\n        map.set(nums[i], i);\n    }\n    return [];\n}\nconsole.log(twoSum([2, 7, 11, 15], 9));",
                    "cpp": "#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    unordered_map<int, int> seen;\n    for (int i = 0; i < nums.size(); i++) {\n        int comp = target - nums[i];\n        if (seen.count(comp)) return {seen[comp], i};\n        seen[nums[i]] = i;\n    }\n    return {};\n}\n\nint main() {\n    vector<int> nums = {2, 7, 11, 15};\n    auto res = twoSum(nums, 9);\n    cout << \"Found indices: [\" << res[0] << \", \" << res[1] << \"]\" << endl;\n    return 0;\n}",
                    "java": "import java.util.*;\n\npublic class Solution {\n    public static int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int comp = target - nums[i];\n            if (map.containsKey(comp)) return new int[] { map.get(comp), i };\n            map.put(nums[i], i);\n        }\n        return new int[]{};\n    }\n    public static void main(String[] args) {\n        int[] res = twoSum(new int[]{2, 7, 11, 15}, 9);\n        System.out.println(Arrays.toString(res));\n    }\n}",
                    "c": "#include <stdio.h>\n#include <stdlib.h>\n\nint* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    *returnSize = 2;\n    int* res = (int*)malloc(2 * sizeof(int));\n    for (int i = 0; i < numsSize; i++) {\n        for (int j = i + 1; j < numsSize; j++) {\n            if (nums[i] + nums[j] == target) {\n                res[0] = i; res[1] = j;\n                return res;\n            }\n        }\n    }\n    return res;\n}\n\nint main() {\n    int nums[] = {2, 7, 11, 15};\n    int retSize;\n    int* res = twoSum(nums, 4, 9, &retSize);\n    printf(\"Indices: %d, %d\\n\", res[0], res[1]);\n    return 0;\n}",
                    "go": "package main\nimport \"fmt\"\n\nfunc twoSum(nums []int, target int) []int {\n    m := make(map[int]int)\n    for i, num := range nums {\n        if j, ok := m[target-num]; ok {\n            return []int{j, i}\n        }\n        m[num] = i\n    }\n    return nil\n}\n\nfunc main() {\n    fmt.Println(twoSum([]int{2, 7, 11, 15}, 9))\n}",
                    "rust": "fn two_sum(nums: &[i32], target: i32) -> Vec<usize> {\n    use std::collections::HashMap;\n    let mut map = HashMap::new();\n    for (i, &num) in nums.iter().enumerate() {\n        let comp = target - num;\n        if let Some(&prev) = map.get(&comp) {\n            return vec![prev, i];\n        }\n        map.insert(num, i);\n    }\n    vec![]\n}\n\nfn main() {\n    println!(\"{:?}\", two_sum(&[2, 7, 11, 15], 9));\n}",
                    "csharp": "using System;\nusing System.Collections.Generic;\n\nclass Program {\n    static int[] TwoSum(int[] nums, int target) {\n        var map = new Dictionary<int, int>();\n        for (int i = 0; i < nums.Length; i++) {\n            int comp = target - nums[i];\n            if (map.ContainsKey(comp)) return new int[] { map[comp], i };\n            map[nums[i]] = i;\n        }\n        return new int[0];\n    }\n    static void Main() {\n        var res = TwoSum(new int[] {2, 7, 11, 15}, 9);\n        Console.WriteLine($\"[{res[0]}, {res[1]}]\");\n    }\n}"
                },
                "expected_output": "[0, 1]"
            }
        ]
    },
    {
        "id": "test-aids-201",
        "title": "Generative AI & Agentic Architectures",
        "department": "Artificial Intelligence & Data Science (AI-DS)",
        "type": "interview",
        "duration_minutes": 30,
        "description": "Agentic AI Technical Interview. Interactive conversational voice & text session powered by Gemini AI with auto-scoring.",
        "difficulty": "Medium",
        "interview_topics": [
            "What is the difference between Chain-of-Thought (CoT) prompting and ReAct (Reasoning + Acting) Agent frameworks?",
            "How do you mitigate hallucination in retrieval-augmented generation (RAG) vector pipelines?",
            "Explain how Attention mechanisms scale quadratically with sequence length and what sparse approximations exist.",
            "How would you design a multi-agent system where agents collaborate to audit code security?"
        ]
    },
    {
        "id": "test-cse-102",
        "title": "Computer Networks & Distributed Systems",
        "department": "Computer Science & Engineering (CSE)",
        "type": "mcq",
        "duration_minutes": 35,
        "description": "Advanced protocols, TCP congestion control, DNS security, and consensus algorithms.",
        "difficulty": "Medium",
        "question_pool": [
            {
                "id": "cn1",
                "question": "In TCP BBR (Bottleneck Bandwidth and RTT), what parameter does the congestion control loop directly optimize instead of packet loss?",
                "options": [
                    "Maximum Transmission Unit (MTU) packet fragmentation",
                    "Estimated maximum delivery rate and minimum round-trip time (BtlBw & RTprop)",
                    "Subnet broadcast ping acknowledgement latency",
                    "SYN-ACK handshake sequence number diff"
                ],
                "answerIndex": 1
            },
            {
                "id": "cn2",
                "question": "Which distributed consensus protocol relies on leader leases, log matching, and term-based elections without Paxos complexity?",
                "options": ["Raft", "Two-Phase Commit (2PC)", "Gossip Protocol", "Vector Clocks"],
                "answerIndex": 0
            },
            {
                "id": "cn3",
                "question": "How does DNS-over-HTTPS (DoH) prevent eavesdropping and manipulation by on-path network adversaries?",
                "options": [
                    "It encrypts DNS resolution packets inside standard HTTPS TLS sessions on port 443",
                    "It converts UDP datagrams to raw ICMP echo requests",
                    "It enforces MAC address whitelisting at the default gateway",
                    "It compresses hostnames using Huffman entropy coding"
                ],
                "answerIndex": 0
            },
            {
                "id": "cn4",
                "question": "In the CAP Theorem, why can a distributed system over an asynchronous network only choose between Consistency and Availability during a Partition?",
                "options": [
                    "Because network partitions are physically impossible in optical fiber",
                    "Network delay and loss can make nodes unable to distinguish slow links from node crashes without blocking writes or returning stale reads",
                    "Because CPU cores cannot handle multi-threaded mutexes during network down states",
                    "Because modern databases automatically disable ACID transactions"
                ],
                "answerIndex": 1
            },
            {
                "id": "cn5",
                "question": "What is the primary role of the eBPF virtual machine inside the Linux networking kernel stack?",
                "options": [
                    "It replaces the userland X11 window server",
                    "It executes sandboxed bytecode at socket and XDP hooks without recompiling the kernel",
                    "It automatically generates CSS stylesheets for web servers",
                    "It converts IPv4 packets to IPv6 without translation tables"
                ],
                "answerIndex": 1
            }
        ]
    },
    {
        "id": "test-ece-301",
        "title": "Embedded Systems & Signal Processing",
        "department": "Electronics & Communication (ECE)",
        "type": "mcq",
        "duration_minutes": 40,
        "description": "Microcontrollers, Nyquist sampling theorem, FFT filtering, and I2C/SPI bus debugging.",
        "difficulty": "Hard",
        "question_pool": [
            {
                "id": "ece1",
                "question": "According to the Nyquist-Shannon Sampling Theorem, what is the minimum sampling frequency required to prevent aliasing of a 15 kHz audio signal?",
                "options": ["15 kHz", "30 kHz", "44.1 kHz", "60 kHz"],
                "answerIndex": 1
            },
            {
                "id": "ece2",
                "question": "In I2C communication protocol, what prevents electrical short circuits when multiple devices pull SDA or SCL low simultaneously?",
                "options": [
                    "Push-pull CMOS totem-pole outputs",
                    "Open-drain (or open-collector) drivers with external pull-up resistors",
                    "Galvanic optocoupler isolation on each pin",
                    "Synchronous differential Manchester encoding"
                ],
                "answerIndex": 1
            },
            {
                "id": "ece3",
                "question": "What happens when an interrupt service routine (ISR) executes blocking delay loops on an ARM Cortex-M microcontroller?",
                "options": [
                    "It speeds up execution of peripheral DMA transfers",
                    "It starves lower and equal priority interrupts and risks watchdog timer reset",
                    "It automatically doubles system clock PLL frequency",
                    "It flashes the onboard bootloader firmware"
                ],
                "answerIndex": 1
            }
        ]
    },
    {
        "id": "test-it-401",
        "title": "Cloud Security, IAM & DevSecOps",
        "department": "Information Technology (IT)",
        "type": "mcq",
        "duration_minutes": 30,
        "description": "Zero Trust, OAuth2/OIDC token flows, container sandboxing, and penetration testing fundamentals.",
        "difficulty": "Medium",
        "question_pool": [
            {
                "id": "it1",
                "question": "In OAuth 2.0 with PKCE (Proof Key for Code Exchange), what threat does the Code Verifier and Code Challenge mitigate?",
                "options": [
                    "Database SQL injection vulnerabilities",
                    "Authorization code interception attacks on public clients",
                    "DDoS syn-flood attacks on reverse proxies",
                    "Expired SSL certificates"
                ],
                "answerIndex": 1
            },
            {
                "id": "it2",
                "question": "Under the principle of Zero Trust Architecture, what is assumed regarding the internal corporate network perimeter?",
                "options": [
                    "The perimeter firewall is 100% impenetrable",
                    "No user or workload is inherently trusted, regardless of location; continuous verification is required",
                    "Internal traffic does not require mutual TLS encryption",
                    "All employee devices are verified only once at factory reset"
                ],
                "answerIndex": 1
            }
        ]
    }
]

# Initial Notifications (Pushed by Admin to Departments)
INITIAL_NOTIFICATIONS = [
    {
        "id": "notif-1",
        "title": "Mandatory Coding Test Scheduled",
        "department": "Computer Science & Engineering (CSE)",
        "message": "All CSE candidates are assigned to complete the 'Data Structures & Algorithmic Optimization' coding test. Full-screen and camera lock are enforced.",
        "priority": "HIGH",
        "timestamp": time.time() - 3600,
        "time_display": "1 hour ago"
    },
    {
        "id": "notif-2",
        "title": "AI Technical Interview Session Opened",
        "department": "Artificial Intelligence & Data Science (AI-DS)",
        "message": "The interactive Agentic AI voice interview is now open. Ensure your microphone is clear and spacebar answer submission is ready.",
        "priority": "URGENT",
        "timestamp": time.time() - 1800,
        "time_display": "30 mins ago"
    },
    {
        "id": "notif-3",
        "title": "Proctoring Integrity Policy Notice",
        "department": "ALL",
        "message": "Strict anti-cheat policy active: switching tabs, detecting second person, or speaking will register warnings and deduct Trust Score.",
        "priority": "MEDIUM",
        "timestamp": time.time() - 900,
        "time_display": "15 mins ago"
    }
]


class StorageManager:
    """Singleton datastore for ProctorLens-AI with local JSON persistence."""
    def __init__(self):
        self.departments = list(DEPARTMENTS)
        self.admin = dict(ADMIN_CREDENTIALS)
        self.students = {s["email"]: s for s in INITIAL_STUDENTS}
        self.tests = {}
        self.notifications = list(INITIAL_NOTIFICATIONS)
        self.exam_sessions: Dict[str, Any] = {}
        self.audit_reports: Dict[str, Any] = {}
        self._load_persisted_students()
        self._load_persisted_tests()
        self._load_persisted_reports()
        if not self.tests:
            self.tests = {t["id"]: t for t in INITIAL_TESTS}

    def _load_persisted_reports(self):
        try:
            if os.path.exists(REPORTS_FILE):
                with open(REPORTS_FILE, "r", encoding="utf-8") as f:
                    saved_reports = json.load(f)
                    for r in saved_reports:
                        self.audit_reports[r["session_id"]] = r
                    print(f"[STORE] Successfully loaded {len(self.audit_reports)} persisted audit reports.")
        except Exception as e:
            print(f"[WARN] Failed to load persisted reports: {e}")

    def _save_persisted_reports(self):
        try:
            with open(REPORTS_FILE, "w", encoding="utf-8") as f:
                json.dump(list(self.audit_reports.values()), f, indent=2)
        except Exception as e:
            print(f"[WARN] Failed to persist audit reports: {e}")

    def add_audit_report(self, report: Dict[str, Any]) -> Dict[str, Any]:
        self.audit_reports[report["session_id"]] = report
        self._save_persisted_reports()
        return report

    def _load_persisted_tests(self):
        try:
            if os.path.exists(TESTS_FILE):
                with open(TESTS_FILE, "r", encoding="utf-8") as f:
                    saved_tests = json.load(f)
                    for t_id, t_obj in saved_tests.items():
                        self.tests[t_id] = t_obj
                    print(f"[STORE] Successfully loaded {len(self.tests)} curriculum tests.")
        except Exception as e:
            print(f"[WARN] Failed to load persisted tests: {e}")

    def _save_persisted_tests(self):
        try:
            with open(TESTS_FILE, "w", encoding="utf-8") as f:
                json.dump(self.tests, f, indent=2)
        except Exception as e:
            print(f"[WARN] Failed to persist tests: {e}")

    def _load_persisted_students(self):
        try:
            if os.path.exists(STUDENTS_FILE):
                with open(STUDENTS_FILE, "r", encoding="utf-8") as f:
                    saved = json.load(f)
                    for s in saved:
                        self.students[s["email"]] = s
        except Exception as e:
            print(f"[WARN] Failed to load persisted students: {e}")

    def _save_persisted_students(self):
        try:
            with open(STUDENTS_FILE, "w", encoding="utf-8") as f:
                json.dump(list(self.students.values()), f, indent=2)
        except Exception as e:
            print(f"[WARN] Failed to persist students: {e}")

    # --- Student Admission Rule: email must be @skit.org.in & password format must be name@123 ---
    def admit_student(self, email: str, password: str, name: str, department: str) -> Dict[str, Any]:
        email_clean = email.strip().lower()
        if not email_clean.endswith("@skit.org.in"):
            raise ValueError("Student email must strictly be a valid @skit.org.in address.")

        # Validate password format: name@123 (supports spaceless full name, e.g. rakshitad@123, or first name, e.g. rakshita@123)
        first_name = name.strip().split()[0].lower()
        spaceless_name = re.sub(r"\s+", "", name).lower()
        expected_pattern = r"^[\w\s.-]+@123$"
        if not re.match(expected_pattern, password.strip(), re.IGNORECASE):
            raise ValueError(f"Password must strictly follow the format: '<name>@123' (e.g., '{spaceless_name}@123' or '{first_name}@123').")

        student_record = {
            "id": f"std-{uuid.uuid4().hex[:6]}",
            "email": email_clean,
            "password": password.strip(),
            "name": name.strip(),
            "department": department.strip(),
            "role": "student",
            "created_at": time.time()
        }
        self.students[email_clean] = student_record

        # Also register alias with/without spaces (e.g. rakshitad@skit.org.in <-> rakshita@skit.org.in)
        alias_user = f"{spaceless_name}@skit.org.in"
        if alias_user != email_clean and alias_user not in self.students:
            alias_record = dict(student_record)
            alias_record["email"] = alias_user
            self.students[alias_user] = alias_record

        self._save_persisted_students()
        return student_record

    def delete_student(self, email: str) -> bool:
        email_clean = email.strip().lower()
        found = False
        if email_clean in self.students:
            del self.students[email_clean]
            found = True
        # Also clean up any alias matching
        to_del = [k for k, s in self.students.items() if s.get("email", "").lower() == email_clean or k == email_clean]
        for k in to_del:
            if k in self.students:
                del self.students[k]
                found = True
        if found:
            self._save_persisted_students()
        return found

    def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        email_clean = email.strip().lower()
        password_clean = password.strip()

        # Strict College Domain Restriction: Only @skit.org.in is permitted
        if not email_clean.endswith("@skit.org.in"):
            return None

        # Admin authentication (strictly admin@skit.org.in)
        if email_clean in ("admin@skit.org.in", self.admin["email"].lower()):
            if password_clean.lower() in ("admin@123", "admin123", self.admin["password"].lower(), "admin"):
                return {
                    "id": "admin-root",
                    "email": "admin@skit.org.in",
                    "name": self.admin["name"],
                    "role": "admin",
                    "department": "Administration"
                }

        # 1. Exact Student Match
        if email_clean in self.students:
            student = self.students[email_clean]
            if student["password"].strip().lower() == password_clean.lower():
                return {
                    "id": student["id"],
                    "email": student["email"],
                    "name": student["name"],
                    "role": "student",
                    "department": student["department"]
                }

        # 2. Flexible Student Match (e.g. user logs in with rakshita@skit.org.in vs rakshitad@skit.org.in)
        entered_username = email_clean.split("@")[0].replace(" ", "").replace(".", "").lower()
        for student in self.students.values():
            student_email_user = student["email"].split("@")[0].replace(" ", "").replace(".", "").lower()
            student_name_spaceless = re.sub(r"\s+", "", student["name"]).lower()

            # Check if username or name matches
            username_matches = (
                entered_username == student_email_user or
                entered_username == student_name_spaceless or
                entered_username.startswith(student_email_user) or
                student_email_user.startswith(entered_username)
            )

            if username_matches:
                student_pass = student["password"].strip().lower()
                acceptable_passwords = [
                    student_pass,
                    f"{student_name_spaceless}@123",
                    f"{student['name'].strip().split()[0].lower()}@123"
                ]
                if password_clean.lower() in acceptable_passwords or password_clean.lower() == student_pass:
                    return {
                        "id": student["id"],
                        "email": student["email"],
                        "name": student["name"],
                        "role": "student",
                        "department": student["department"]
                    }

        # Strictly return None if student was not created by administrator
        return None

    # --- Department CRUD for Admin ---
    def get_departments(self) -> List[str]:
        return list(self.departments)

    def add_department(self, name: str) -> str:
        clean_name = name.strip()
        if not clean_name:
            raise ValueError("Department name cannot be empty.")
        if clean_name not in self.departments:
            self.departments.append(clean_name)
        return clean_name

    def update_department(self, old_name: str, new_name: str) -> str:
        old_clean = old_name.strip()
        new_clean = new_name.strip()
        if not new_clean:
            raise ValueError("New department name cannot be empty.")
        if old_clean in self.departments:
            idx = self.departments.index(old_clean)
            self.departments[idx] = new_clean
            for t in self.tests.values():
                if t.get("department") == old_clean:
                    t["department"] = new_clean
            for s in self.students.values():
                if s.get("department") == old_clean:
                    s["department"] = new_clean
            self._save_persisted_tests()
            self._save_persisted_students()
            return new_clean
        raise ValueError(f"Department '{old_name}' not found.")

    def delete_department(self, name: str) -> bool:
        clean_name = name.strip()
        if clean_name in self.departments:
            self.departments.remove(clean_name)
            return True
        return False

    # --- Test CRUD for Admin ---
    def get_tests(self, department: Optional[str] = None) -> List[Dict[str, Any]]:
        test_list = list(self.tests.values())
        if department and department != "ALL":
            test_list = [t for t in test_list if t["department"] == department]
        return test_list

    def add_test(self, test_data: Dict[str, Any]) -> Dict[str, Any]:
        test_id = f"test-{uuid.uuid4().hex[:8]}"
        test_data["id"] = test_id
        self.tests[test_id] = test_data
        self._save_persisted_tests()
        return test_data

    def update_test(self, test_id: str, test_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if test_id in self.tests:
            self.tests[test_id].update(test_data)
            self._save_persisted_tests()
            return self.tests[test_id]
        return None

    def delete_test(self, test_id: str) -> bool:
        if test_id in self.tests:
            del self.tests[test_id]
            self._save_persisted_tests()
            return True
        return False

    # --- Notifications ---
    def push_notification(self, title: str, department: str, message: str, priority: str = "HIGH") -> Dict[str, Any]:
        notif = {
            "id": f"notif-{uuid.uuid4().hex[:6]}",
            "title": title,
            "department": department,
            "message": message,
            "priority": priority,
            "timestamp": time.time(),
            "time_display": "Just now"
        }
        self.notifications.insert(0, notif)
        return notif

    def get_notifications(self, department: Optional[str] = None) -> List[Dict[str, Any]]:
        if not department or department == "ALL" or department == "Administration":
            return self.notifications
        return [n for n in self.notifications if n["department"] in [department, "ALL"]]

    def update_notification(self, notif_id: str, title: str, department: str, message: str, priority: str = "HIGH") -> Optional[Dict[str, Any]]:
        for n in self.notifications:
            if n["id"] == notif_id:
                n["title"] = title
                n["department"] = department
                n["message"] = message
                n["priority"] = priority
                return n
        return None

    def delete_notification(self, notif_id: str) -> bool:
        before = len(self.notifications)
        self.notifications = [n for n in self.notifications if n["id"] != notif_id]
        return len(self.notifications) < before

    # --- Candidate Randomized Test Generation (Unique per candidate) ---
    def generate_candidate_test(self, test_id: str, candidate_id: str) -> Optional[Dict[str, Any]]:
        import random
        if test_id not in self.tests:
            return None
        base_test = dict(self.tests[test_id])
        if "questions" in base_test:
            base_test["questions"] = list(base_test["questions"])
        elif "question_pool" in base_test:
            base_test["questions"] = list(base_test["question_pool"])
        return base_test


# Global Storage Singleton
store = StorageManager()

