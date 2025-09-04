---
trigger: model_decision
description: When working on resolving or identifying any issues either internally or provided by user consider referring to the below rules.
---

#Error/Bug Fixing Rules:


For solving general errors or bugs that are broad, follow the below guidelines : 

ANALYSIS APPROACH:
1. For each given issue Analyse it properly and add to Task
2. Trace the error through the entire call stack
3. Identify root cause, not just symptoms
4. Check for similar patterns elsewhere that might have same issue
5. Consider side effects of the fix and always find all the occurences before attemtping to fix it.

DELIVERABLES:
- Root cause explanation
- Complete fix implementation
- Verification that fix doesn't break other functionality
- Prevention strategy for similar issues



#Cascading Modification/Issue Handling Rules: 

Consider this, for solving major bugs or errors that require critical identification and crucial thinking with updation of data in nested segments carefully. 

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