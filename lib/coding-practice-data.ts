export interface CodingProblem {
    id: number
    title: string
    difficulty: "Basic" | "Core" | "Pro"
    companies: string[]
    isLocked: boolean
    topics: string[]
    isPOTD?: boolean
    isSolved?: boolean
    isBookmarked?: boolean
    acceptance: string
    description: string
    starterCode: {
        python: string
        javascript: string
        cpp: string
        java: string
    }
    hints: string[]
    testCases: { input: string; expectedOutput: string }[]
}

export interface CompanyInfo {
    name: string
    count: number
    category: "Global" | "Indian"
    logo?: string
    color: string
}

export const TOP_COMPANIES: CompanyInfo[] = [
    // Global
    { name: "Amazon", count: 443, category: "Global", color: "#FF9900" },
    { name: "Google", count: 447, category: "Global", color: "#4285F4" },
    { name: "Meta", count: 357, category: "Global", color: "#0668E1" },
    { name: "Uber", count: 433, category: "Global", color: "#000000" },
    { name: "Microsoft", count: 466, category: "Global", color: "#00A4EF" },
    { name: "Oracle", count: 431, category: "Global", color: "#F80000" },
    { name: "Salesforce", count: 412, category: "Global", color: "#00A1E0" },
    { name: "Apple", count: 400, category: "Global", color: "#A2AAAD" },
    { name: "Adobe", count: 404, category: "Global", color: "#FF0000" },
    { name: "LinkedIn", count: 406, category: "Global", color: "#0A66C2" },
    { name: "Atlassian", count: 378, category: "Global", color: "#0052CC" },
    { name: "Intuit", count: 371, category: "Global", color: "#0077C5" },
    { name: "Netflix", count: 214, category: "Global", color: "#E50914" },
    { name: "Cisco", count: 289, category: "Global", color: "#1BA0D7" },
    { name: "Bloomberg", count: 345, category: "Global", color: "#4B0082" },
    { name: "Goldman Sachs", count: 320, category: "Global", color: "#7399C6" },

    // Indian
    { name: "Flipkart", count: 285, category: "Indian", color: "#2874F0" },
    { name: "Swiggy", count: 192, category: "Indian", color: "#FC8019" },
    { name: "Zomato", count: 164, category: "Indian", color: "#CB202D" },
    { name: "Paytm", count: 210, category: "Indian", color: "#002E6E" },
    { name: "TCS", count: 340, category: "Indian", color: "#1C3C6B" },
    { name: "Infosys", count: 310, category: "Indian", color: "#007CC3" },
    { name: "Wipro", count: 220, category: "Indian", color: "#482683" },
    { name: "Ola", count: 178, category: "Indian", color: "#7BAA14" },
    { name: "CRED", count: 145, category: "Indian", color: "#000000" },
    { name: "PhonePe", count: 198, category: "Indian", color: "#5F259F" },
    { name: "Meesho", count: 162, category: "Indian", color: "#9B2B64" },
    { name: "Razorpay", count: 155, category: "Indian", color: "#0C2340" },
]

export const CODING_PROBLEMS: CodingProblem[] = [
    {
        id: 711,
        title: "Capitalize First and Last Character of Each Word",
        difficulty: "Basic",
        companies: ["Amazon", "Google"],
        isLocked: true,
        topics: ["Strings"],
        isPOTD: true,
        isSolved: true,
        isBookmarked: false,
        acceptance: "68.4%",
        description: `Given a string \`s\` containing space-separated words, capitalize the first and last character of each word. If a word consists of only one character, convert it to uppercase.
        
### Example 1:
\`\`\`
Input: s = "hello world"
Output: "HellO WorlD"
\`\`\`

### Example 2:
\`\`\`
Input: s = "i love coding"
Output: "I LovE CodinG"
\`\`\``,
        starterCode: {
            python: `def capitalizeFirstAndLast(s: str) -> str:
    words = s.split(' ')
    result = []
    for w in words:
        if len(w) <= 1:
            result.append(w.upper())
        else:
            result.append(w[0].upper() + w[1:-1] + w[-1].upper())
    return ' '.join(result)

# Test your code
print(capitalizeFirstAndLast("hello world"))`,
            javascript: `function capitalizeFirstAndLast(s) {
    return s.split(' ').map(w => {
        if (w.length <= 1) return w.toUpperCase();
        return w[0].toUpperCase() + w.slice(1, -1) + w[w.length - 1].toUpperCase();
    }).join(' ');
}

console.log(capitalizeFirstAndLast("hello world"));`,
            cpp: `#include <iostream>
#include <sstream>
#include <vector>
using namespace std;

string capitalizeFirstAndLast(string s) {
    stringstream ss(s);
    string word, result = "";
    bool first = true;
    while (ss >> word) {
        if (!first) result += " ";
        first = false;
        if (word.length() <= 1) {
            result += toupper(word[0]);
        } else {
            word[0] = toupper(word[0]);
            word[word.length() - 1] = toupper(word[word.length() - 1]);
            result += word;
        }
    }
    return result;
}

int main() {
    cout << capitalizeFirstAndLast("hello world") << endl;
    return 0;
}`,
            java: `public class Solution {
    public static String capitalizeFirstAndLast(String s) {
        String[] words = s.split(" ");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < words.length; i++) {
            String w = words[i];
            if (w.length() <= 1) {
                sb.append(w.toUpperCase());
            } else {
                sb.append(Character.toUpperCase(w.charAt(0)))
                  .append(w.substring(1, w.length() - 1))
                  .append(Character.toUpperCase(w.charAt(w.length() - 1)));
            }
            if (i < words.length - 1) sb.append(" ");
        }
        return sb.toString();
    }
    public static void main(String[] args) {
        System.out.println(capitalizeFirstAndLast("hello world"));
    }
}`
        },
        hints: [
            "Split the string by spaces to isolate individual words.",
            "Check length of word: if length is 1, just uppercase it.",
            "Otherwise, slice word[0], middle, and word[-1]."
        ],
        testCases: [
            { input: '"hello world"', expectedOutput: "HellO WorlD" },
            { input: '"i love coding"', expectedOutput: "I LovE CodinG" }
        ]
    },
    {
        id: 1,
        title: "Two Sum",
        difficulty: "Basic",
        companies: ["Amazon", "Google", "Meta", "Microsoft"],
        isLocked: true,
        topics: ["Hashing", "Arrays"],
        isSolved: true,
        isBookmarked: true,
        acceptance: "52.8%",
        description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

### Example:
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\``,
        starterCode: {
            python: `def twoSum(nums, target):
    lookup = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in lookup:
            return [lookup[complement], i]
        lookup[num] = i
    return []

# Test
print(twoSum([2, 7, 11, 15], 9))`,
            javascript: `function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const comp = target - nums[i];
        if (map.has(comp)) return [map.get(comp), i];
        map.set(nums[i], i);
    }
    return [];
}

console.log(twoSum([2, 7, 11, 15], 9));`,
            cpp: `#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> mp;
    for (int i = 0; i < nums.size(); ++i) {
        int comp = target - nums[i];
        if (mp.count(comp)) return {mp[comp], i};
        mp[nums[i]] = i;
    }
    return {};
}

int main() {
    vector<int> nums = {2, 7, 11, 15};
    vector<int> res = twoSum(nums, 9);
    cout << "[" << res[0] << ", " << res[1] << "]" << endl;
    return 0;
}`,
            java: `import java.util.*;

public class Solution {
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int comp = target - nums[i];
            if (map.containsKey(comp)) return new int[] { map.get(comp), i };
            map.put(nums[i], i);
        }
        return new int[]{};
    }
    public static void main(String[] args) {
        System.out.println(Arrays.toString(twoSum(new int[]{2,7,11,15}, 9)));
    }
}`
        },
        hints: [
            "Can you solve it in O(n) time using a Hash Map?",
            "Store each number and its index in the map as you iterate."
        ],
        testCases: [
            { input: "nums = [2,7,11,15], target = 9", expectedOutput: "[0, 1]" }
        ]
    },
    {
        id: 2,
        title: "Search X in sorted array",
        difficulty: "Basic",
        companies: ["Microsoft", "Uber", "Oracle"],
        isLocked: true,
        topics: ["Binary Search", "Arrays"],
        isSolved: true,
        isBookmarked: false,
        acceptance: "58.1%",
        description: `Given a sorted array \`nums\` of \`n\` integers and a target value \`target\`, return the index of \`target\` if found. If not, return -1. Solve in O(log n) runtime.`,
        starterCode: {
            python: `def binarySearch(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

print(binarySearch([-1, 0, 3, 5, 9, 12], 9))`,
            javascript: `function binarySearch(nums, target) {
    let left = 0, right = nums.length - 1;
    while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;
        if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}

console.log(binarySearch([-1, 0, 3, 5, 9, 12], 9));`,
            cpp: `#include <iostream>
#include <vector>
using namespace std;

int binarySearch(const vector<int>& nums, int target) {
    int l = 0, r = nums.size() - 1;
    while (l <= r) {
        int m = l + (r - l) / 2;
        if (nums[m] == target) return m;
        if (nums[m] < target) l = m + 1;
        else r = m - 1;
    }
    return -1;
}

int main() {
    cout << binarySearch({-1, 0, 3, 5, 9, 12}, 9) << endl;
    return 0;
}`,
            java: `public class Solution {
    public static int search(int[] nums, int target) {
        int l = 0, r = nums.length - 1;
        while (l <= r) {
            int m = l + (r - l) / 2;
            if (nums[m] == target) return m;
            if (nums[m] < target) l = m + 1;
            else r = m - 1;
        }
        return -1;
    }
    public static void main(String[] args) {
        System.out.println(search(new int[]{-1, 0, 3, 5, 9, 12}, 9));
    }
}`
        },
        hints: [
            "Use two pointers: left and right.",
            "Compute mid = left + (right - left) // 2 to avoid overflow."
        ],
        testCases: [
            { input: "nums = [-1,0,3,5,9,12], target = 9", expectedOutput: "4" }
        ]
    },
    {
        id: 3,
        title: "Reverse a Linked List",
        difficulty: "Core",
        companies: ["Amazon", "Google", "Apple", "Adobe"],
        isLocked: true,
        topics: ["Linked List"],
        isSolved: true,
        isBookmarked: true,
        acceptance: "74.6%",
        description: `Given the head of a singly linked list, reverse the list, and return the reversed list. Can you do it iteratively and recursively?`,
        starterCode: {
            python: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def reverseList(head):
    prev = None
    curr = head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev

# Setup: 1 -> 2 -> 3 -> None
h = ListNode(1, ListNode(2, ListNode(3)))
rev = reverseList(h)
print(rev.val, rev.next.val, rev.next.next.val)`,
            javascript: `function reverseList(head) {
    let prev = null, curr = head;
    while (curr) {
        let nxt = curr.next;
        curr.next = prev;
        prev = curr;
        curr = nxt;
    }
    return prev;
}`,
            cpp: `struct ListNode {
    int val;
    ListNode *next;
    ListNode(int x) : val(x), next(nullptr) {}
};

ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* curr = head;
    while (curr) {
        ListNode* nxt = curr->next;
        curr->next = prev;
        prev = curr;
        curr = nxt;
    }
    return prev;
}`,
            java: `public class Solution {
    public static ListNode reverseList(ListNode head) {
        ListNode prev = null, curr = head;
        while (curr != null) {
            ListNode next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }
}`
        },
        hints: [
            "Keep track of three pointers: prev, curr, next.",
            "Flip curr.next to point backward to prev."
        ],
        testCases: [
            { input: "[1, 2, 3, 4, 5]", expectedOutput: "[5, 4, 3, 2, 1]" }
        ]
    },
    {
        id: 4,
        title: "Level Order Traversal",
        difficulty: "Core",
        companies: ["Meta", "Amazon", "LinkedIn", "Microsoft"],
        isLocked: true,
        topics: ["Binary Trees", "BFS"],
        isSolved: true,
        isBookmarked: false,
        acceptance: "66.2%",
        description: `Given the root of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).`,
        starterCode: {
            python: `from collections import deque

def levelOrder(root):
    if not root:
        return []
    result = []
    q = deque([root])
    while q:
        level = []
        for _ in range(len(q)):
            node = q.popleft()
            level.append(node.val)
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
        result.append(level)
    return result`,
            javascript: `function levelOrder(root) {
    if (!root) return [];
    const res = [];
    const queue = [root];
    while (queue.length) {
        const len = queue.length;
        const level = [];
        for (let i = 0; i < len; i++) {
            const node = queue.shift();
            level.push(node.val);
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
        res.push(level);
    }
    return res;
}`,
            cpp: `// C++ BFS level order traversal`,
            java: `// Java BFS level order traversal`
        },
        hints: [
            "Use a queue to process nodes level by level.",
            "Record the queue size at the start of each level."
        ],
        testCases: [
            { input: "[3,9,20,null,null,15,7]", expectedOutput: "[[3],[9,20],[15,7]]" }
        ]
    },
    {
        id: 5,
        title: "Number of Islands",
        difficulty: "Core",
        companies: ["Amazon", "Google", "Bloomberg", "Uber"],
        isLocked: true,
        topics: ["Graphs", "BFS/DFS"],
        isSolved: true,
        isBookmarked: true,
        acceptance: "59.3%",
        description: `Given an m x n 2D binary grid grid which represents a map of '1's (land) and '0's (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.`,
        starterCode: {
            python: `def numIslands(grid):
    if not grid: return 0
    rows, cols = len(grid), len(grid[0])
    islands = 0

    def dfs(r, c):
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] != '1':
            return
        grid[r][c] = '0' # mark visited
        dfs(r + 1, c)
        dfs(r - 1, c)
        dfs(r, c + 1)
        dfs(r, c - 1)

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                islands += 1
                dfs(r, c)
    return islands

grid = [
  ["1","1","0","0","0"],
  ["1","1","0","0","0"],
  ["0","0","1","0","0"],
  ["0","0","0","1","1"]
]
print(numIslands(grid))`,
            javascript: `function numIslands(grid) {
    if (!grid.length) return 0;
    let count = 0;
    function dfs(r, c) {
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] !== '1') return;
        grid[r][c] = '0';
        dfs(r + 1, c);
        dfs(r - 1, c);
        dfs(r, c + 1);
        dfs(r, c - 1);
    }
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
            if (grid[r][c] === '1') {
                count++;
                dfs(r, c);
            }
        }
    }
    return count;
}`,
            cpp: `// C++ DFS for grid islands`,
            java: `// Java DFS for grid islands`
        },
        hints: [
            "Traverse each cell in the matrix.",
            "When encountering '1', launch a DFS/BFS to sink the entire connected island."
        ],
        testCases: [
            { input: "4x5 grid with 3 islands", expectedOutput: "3" }
        ]
    },
    {
        id: 6,
        title: "Subsets I",
        difficulty: "Core",
        companies: ["Meta", "Apple", "Salesforce"],
        isLocked: true,
        topics: ["Recursion", "Backtracking"],
        isSolved: true,
        isBookmarked: false,
        acceptance: "77.5%",
        description: `Given an integer array nums of unique elements, return all possible subsets (the power set). The solution set must not contain duplicate subsets. Return the solution in any order.`,
        starterCode: {
            python: `def subsets(nums):
    result = []
    def backtrack(start, path):
        result.append(path[:])
        for i in range(start, len(nums)):
            path.append(nums[i])
            backtrack(i + 1, path)
            path.pop()
    backtrack(0, [])
    return result

print(subsets([1, 2, 3]))`,
            javascript: `function subsets(nums) {
    const res = [];
    function backtrack(start, path) {
        res.push([...path]);
        for (let i = start; i < nums.length; i++) {
            path.push(nums[i]);
            backtrack(i + 1, path);
            path.pop();
        }
    }
    backtrack(0, []);
    return res;
}
console.log(subsets([1, 2, 3]));`,
            cpp: `// C++ Backtracking power set`,
            java: `// Java Backtracking power set`
        },
        hints: [
            "At each element, you have two choices: include it or exclude it.",
            "Use backtracking or bit manipulation (1 << n)."
        ],
        testCases: [
            { input: "nums = [1, 2, 3]", expectedOutput: "[[],[1],[1,2],[1,2,3],[1,3],[2],[2,3],[3]]" }
        ]
    },
    {
        id: 7,
        title: "Climbing stairs",
        difficulty: "Core",
        companies: ["Adobe", "Google", "Amazon", "Microsoft"],
        isLocked: true,
        topics: ["Dynamic Programming", "Math"],
        isSolved: true,
        isBookmarked: false,
        acceptance: "53.2%",
        description: `You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?`,
        starterCode: {
            python: `def climbStairs(n: int) -> int:
    if n <= 2: return n
    first, second = 1, 2
    for _ in range(3, n + 1):
        first, second = second, first + second
    return second

print(climbStairs(5))`,
            javascript: `function climbStairs(n) {
    if (n <= 2) return n;
    let a = 1, b = 2;
    for (let i = 3; i <= n; i++) {
        const next = a + b;
        a = b;
        b = next;
    }
    return b;
}
console.log(climbStairs(5));`,
            cpp: `int climbStairs(int n) {
    if (n <= 2) return n;
    int a = 1, b = 2;
    for (int i = 3; i <= n; i++) {
        int c = a + b;
        a = b;
        b = c;
    }
    return b;
}`,
            java: `public class Solution {
    public static int climbStairs(int n) {
        if (n <= 2) return n;
        int a = 1, b = 2;
        for (int i = 3; i <= n; i++) {
            int c = a + b;
            a = b;
            b = c;
        }
        return b;
    }
}`
        },
        hints: [
            "To reach step n, you must come from step n-1 or step n-2.",
            "This reduces to the Fibonacci sequence!"
        ],
        testCases: [
            { input: "n = 3", expectedOutput: "3" },
            { input: "n = 5", expectedOutput: "8" }
        ]
    },
    {
        id: 8,
        title: "Trapping Rainwater",
        difficulty: "Pro",
        companies: ["Google", "Amazon", "Goldman Sachs", "Meta"],
        isLocked: true,
        topics: ["Stack & Queue", "Two Pointers"],
        isSolved: true,
        isBookmarked: true,
        acceptance: "61.0%",
        description: `Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.`,
        starterCode: {
            python: `def trap(height):
    if not height: return 0
    left, right = 0, len(height) - 1
    left_max, right_max = 0, 0
    water = 0
    while left < right:
        if height[left] < height[right]:
            if height[left] >= left_max:
                left_max = height[left]
            else:
                water += left_max - height[left]
            left += 1
        else:
            if height[right] >= right_max:
                right_max = height[right]
            else:
                water += right_max - height[right]
            right -= 1
    return water

print(trap([0,1,0,2,1,0,1,3,2,1,2,1]))`,
            javascript: `function trap(height) {
    let l = 0, r = height.length - 1;
    let lMax = 0, rMax = 0, res = 0;
    while (l < r) {
        if (height[l] < height[r]) {
            if (height[l] >= lMax) lMax = height[l];
            else res += lMax - height[l];
            l++;
        } else {
            if (height[r] >= rMax) rMax = height[r];
            else res += rMax - height[r];
            r--;
        }
    }
    return res;
}`,
            cpp: `// C++ Two Pointers for trapping water`,
            java: `// Java Two Pointers for trapping water`
        },
        hints: [
            "Use two pointers from left and right boundaries.",
            "Water trapped at current index is determined by min(max_left, max_right) - height[i]."
        ],
        testCases: [
            { input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", expectedOutput: "6" }
        ]
    },
    {
        id: 9,
        title: "K-th Largest element in an array",
        difficulty: "Pro",
        companies: ["Meta", "Amazon", "Atlassian", "Intuit"],
        isLocked: true,
        topics: ["Heaps", "Priority Queue"],
        isSolved: true,
        isBookmarked: false,
        acceptance: "67.4%",
        description: `Given an integer array nums and an integer k, return the kth largest element in the array. Can you solve it without sorting in O(n log k) or O(n) expected time?`,
        starterCode: {
            python: `import heapq

def findKthLargest(nums, k):
    min_heap = []
    for num in nums:
        heapq.heappush(min_heap, num)
        if len(min_heap) > k:
            heapq.heappop(min_heap)
    return min_heap[0]

print(findKthLargest([3,2,1,5,6,4], 2))`,
            javascript: `// Min-heap or QuickSelect for Kth largest element`,
            cpp: `// C++ priority_queue`,
            java: `// Java PriorityQueue`
        },
        hints: [
            "A min-heap of size k retains the k largest elements.",
            "QuickSelect algorithm gives average O(n) runtime."
        ],
        testCases: [
            { input: "nums = [3,2,1,5,6,4], k = 2", expectedOutput: "5" }
        ]
    },
    {
        id: 15,
        title: "3Sum",
        difficulty: "Core",
        companies: ["Amazon", "Meta", "Google"],
        isLocked: true,
        topics: ["Two Pointers", "Sorting"],
        isSolved: false,
        isBookmarked: true,
        acceptance: "34.5%",
        description: `Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.`,
        starterCode: {
            python: `def threeSum(nums):
    nums.sort()
    res = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        l, r = i + 1, len(nums) - 1
        while l < r:
            s = nums[i] + nums[l] + nums[r]
            if s < 0:
                l += 1
            elif s > 0:
                r -= 1
            else:
                res.append([nums[i], nums[l], nums[r]])
                while l < r and nums[l] == nums[l + 1]: l += 1
                while l < r and nums[r] == nums[r - 1]: r -= 1
                l += 1
                r -= 1
    return res

print(threeSum([-1,0,1,2,-1,-4]))`,
            javascript: `// 3Sum solution`,
            cpp: `// C++ 3Sum`,
            java: `// Java 3Sum`
        },
        hints: [
            "Sort the array first to handle duplicates easily.",
            "Fix one element and use two pointers for the remaining sum."
        ],
        testCases: [
            { input: "nums = [-1,0,1,2,-1,-4]", expectedOutput: "[[-1,-1,2],[-1,0,1]]" }
        ]
    },
    {
        id: 20,
        title: "Valid Parentheses",
        difficulty: "Basic",
        companies: ["Google", "Microsoft", "Amazon"],
        isLocked: true,
        topics: ["Stack & Queue", "Strings"],
        isSolved: false,
        isBookmarked: false,
        acceptance: "40.9%",
        description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.`,
        starterCode: {
            python: `def isValid(s: str) -> bool:
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return not stack

print(isValid("()[]{}"))`,
            javascript: `// Valid Parentheses`,
            cpp: `// C++ stack`,
            java: `// Java Stack`
        },
        hints: [
            "Use a stack to match opening brackets with corresponding closing brackets."
        ],
        testCases: [
            { input: 's = "()[]{}"', expectedOutput: "true" }
        ]
    },
    {
        id: 146,
        title: "LRU Cache",
        difficulty: "Pro",
        companies: ["Amazon", "Google", "Microsoft", "Meta"],
        isLocked: true,
        topics: ["Hash Table", "Doubly Linked List", "Design"],
        isSolved: false,
        isBookmarked: true,
        acceptance: "42.8%",
        description: `Design a data structure that follows the constraints of a Least Recently Used (LRU) cache with O(1) get and put operations.`,
        starterCode: {
            python: `class DLinkedNode:
    def __init__(self, key=0, value=0):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None

class LRUCache:
    def __init__(self, capacity: int):
        self.cache = {}
        self.head = DLinkedNode()
        self.tail = DLinkedNode()
        self.head.next = self.tail
        self.tail.prev = self.head
        self.capacity = capacity
        self.size = 0`,
            javascript: `// LRU Cache implementation`,
            cpp: `// C++ LRU Cache`,
            java: `// Java LRU Cache`
        },
        hints: [
            "Combine a hash map with a doubly linked list for O(1) lookup and deletion."
        ],
        testCases: [
            { input: 'capacity = 2, put(1,1), put(2,2), get(1)', expectedOutput: "1" }
        ]
    }
]

export const TOPIC_FILTERS = [
    "All Topics",
    "Strings",
    "Hashing",
    "Binary Search",
    "Linked List",
    "Binary Trees",
    "Graphs",
    "Recursion",
    "Dynamic Programming",
    "Stack & Queue",
    "Heaps",
    "Arrays",
    "Two Pointers",
]
