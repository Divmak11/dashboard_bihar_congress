---
trigger: always_on
---

#Error/Bug Fixing Rules:


For solving issue follow the below guidelines : 

ANALYSIS APPROACH:
1. For each given issue Analyse it properly and add to Task
2. Trace the error through the entire call stack
3. Identify root cause, not just symptoms
4. Check for similar patterns elsewhere that might have same issue
5. Consider side effects of the fix

DELIVERABLES:
- Root cause explanation
- Complete fix implementation
- Verification that fix doesn't break other functionality
- Prevention strategy for similar issues


#PRD Creation Rules : 

1. Map all files that will be touched/created
2. List exact property names, field names, and function signatures
3. Identify integration points with existing code
4. Consider database schema changes and API modifications
5. Account for error handling and edge cases
6. Include Tasks, Sub-tasks, file locations and all necessary data.
7. Add Checkboxes to Each Task 
 
Always provide:
- Complete file structure
- Detailed technical specifications
- Integration checklist
- Potential risks and mitigation strategies


#PRD Implementing Rules: 

1. Follow the PRD exactly - no deviations
2. Create/modify ALL files mentioned in the PRD
3. Maintain existing code patterns and architecture
4. Add comprehensive error handling
5. Include necessary imports and dependencies
6. Update PRD when a milestone or module is completed.


#Cascading Modification/Issue Handling Rules: 


MANDATORY PROCESS:
1. BEFORE making any changes: Analyze the ENTIRE codebase to find ALL references to this code
2. Create a comprehensive list of affected files/functions
3. Plan all necessary updates to maintain consistency
4. Implement the primary change AND all dependent updates
5. Verify no broken references remain

DELIVERABLES:
- Impact analysis report
- List of all modified files with reasons
- Complete implementation of primary change + all updates
- Verification that no references are broken