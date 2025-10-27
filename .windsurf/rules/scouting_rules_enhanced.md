---
trigger: manual
---

PURPOSE: 

For analysing the codebase, identifying dependent files, and logically planning changes involving structure, files, and edge-case considerations **before** any implementation.


### **Guidelines:**

1. Output a concise summary of your understanding of the task in plain English.

2. Thoroughly analyse the codebase structure by referring to `.windsurf/CodeMap.md` and any related configuration or dependency maps.

3. Identify all directly and indirectly impacted files, modules, and functions related to the requested change (including interfaces, imports, tests, mocks, and constants).

4. Trace dependencies both upstream and downstream — e.g., functions calling or being called by the component in question.

5. Consider all existing implementations, edge cases, and side effects before proposing any structural or logical changes.

6. Design astep-by-step logical plan describing what needs to change, why it needs to change, and how those changes propagate across the codebase.

7. Highlight any assumptions or uncertainties discovered during analysis (e.g., missing context, ambiguous patterns).

8. After the full analysis, list the sequence of updates that should be made across files to maintain consistency and prevent syntax or logical errors.

9. End with a detailed summary of the plan, describing the overall logic, dependencies, and intended effect on the system.

---

### ⚠️ **PREVENTIONS:**

1. 🚫 Do not refactor, implement, or modify any code in this phase.
2. 🚫 Do not output code or code snippets — only reasoning and planning in natural language.
3. 🚫 Avoid making assumptions that change business logic unless they are explicitly confirmed in the task description.
4. Always validate your assumptions against existing architecture (e.g., from `CodeMap.md` or visible imports).

---

### 📦 DELIVERABLES:

1. 🧩 Summary of the required task and the intended change in plain English.
2. 📁 A comprehensive list of all files, modules, and specific sections that need to be updated (including indirect dependencies and test files).
3. 🧠 A logical step-by-step plan describing how to execute the change*, in what order, and why each step is necessary.
4. 📈 If the task involves a comparison or trade-off, explain how and why the proposed direction is better in context (mentioning performance, maintainability, or clarity).
5. 🔍 Dependency summary: include a section outlining upstream and downstream dependencies for verification before implementation.
6. ✅ Final output format: Use structured, readable natural language (with optional sub-headings like *Files Affected*, *Change Propagation*, *Edge-Case Implications*, *Next Steps*).

---

### ✨ Example Output Structure (for consistency across models):

```
### 1. Task Understanding
Briefly summarise what the task requires.

### 2. Analysis of Codebase
List where in the codebase the relevant logic currently resides.

### 3. Files and Dependencies to Update
- /src/api/UserService.ts — function X depends on changed method
- /src/components/Profile.tsx — calls UserService.getUser()
- /tests/UserService.test.ts — test cases rely on old signature

### 4. Logical Plan
Step 1 → Step 2 → Step 3 …  
(Each step should note why it’s needed and what risk it mitigates)

### 5. Edge Cases / Validation
List potential breakpoints or tests to re-run.

### 6. Next Steps
Clear plan for the implementation phase.
```

