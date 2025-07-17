---
description: "PRD for WTM-SLP Module Firebase Migration"
globs: ["app/wtm-slp/page.tsx", "app/utils/fetchFirebaseData.ts", "app/utils/firebase.ts", "models/types.ts"]
alwaysApply: true
---

# PRD: WTM-SLP Module - Firebase Data Migration

## 1. Objective

The primary objective of this project is to migrate the data source for the WTM-SLP (Women Techmakers - SLP) module from the current Google Sheets integration to a more robust and scalable Firebase Firestore backend. The entire migration must be accomplished without altering the existing User Interface (UI) or User Experience (UX), ensuring a seamless transition for the end-user.

## 2. Scope

This migration covers two main sections of the WTM-SLP module:

1.  **Overall Summary Cards:** The main dashboard view showing "Total Meetings," "Total SLPs," and "Total Onboarded."
2.  **Assembly Coordinator (AC) View:** The detailed view for each coordinator, including their personal details and performance metrics.

## 3. Affected Files

The following files will be modified or created during this implementation:

*   `app/wtm-slp/page.tsx`: Main component for the WTM-SLP page.
*   `app/utils/fetchFirebaseData.ts`: Will contain all new logic for fetching and processing data from Firebase Firestore.
*   `app/utils/firebase.ts`: For initializing the Firebase application and exporting the Firestore instance.
*   `models/types.ts` (New File): To define TypeScript interfaces for data models.
*   `.env.local` (Potentially New File): To store Firebase credentials securely.

---

## 4. Task Breakdown & Implementation Plan

### **Phase 1: Setup and Configuration**

This phase focuses on establishing the foundational elements for Firebase integration.

- [x] **Task 1.1: Firebase Initialization**
    - **Description:** Configure the connection to the Firebase project securely.
    - **Sub-tasks:**
        - [x] Create `.env.local` at the project root if it doesn't exist.
        - [x] Add all Firebase configuration keys (apiKey, authDomain, etc.) to `.env.local` with a `NEXT_PUBLIC_` prefix to make them accessible on the client-side.
        - [x] **File:** `app/utils/firebase.ts`
            - [x] Read the environment variables from `process.env`.
            - [x] Initialize the Firebase app using `initializeApp` only if it hasn't been initialized already.
            - [x] Get the Firestore instance using `getFirestore` and export it for use throughout the application.

- [x] **Task 1.2: Data Modeling**
    - **Description:** Define consistent TypeScript data structures for objects retrieved from Firebase to ensure type safety.
    - **Sub-tasks:**
        - [x] **File:** `models/types.ts` (Create this new file and directory if they don't exist).
        - [x] **Define `WtmSlpEntry` Interface:**
            - [x] `id: string` (document ID)
            - [x] `dateOfVisit: string` (in "YYYY-MM-DD" format)
            - [x] `form_type?: 'meetings' | 'activity' | 'assembly-wa'`
            - [x] `type?: 'meetings' | 'activity' | 'assembly-wa'` (for older documents)
            - [x] `userId?: string` (UID of the creator)
            - [x] `recommendedPosition?: string`
            - [x] `onboardingStatus?: string`
            - [x] `groupName?: string`
            - [x] `membersCount?: number`
            - [x] `status?: 'Active' | 'Inactive'`
            - [x] `contentFlow?: string`
            - [x] ... and any other fields related to activities.
        - [x] **Define `User` Interface:**
            - [x] `uid: string` (document ID)
            - [x] `role: 'Zonal Incharge' | 'Assembly Coordinator' | 'SLP'`
            - [x] `departmentHead: string`
            - [x] `name: string`
            - [x] `assembly: string`
            - [x] `village: string`
            - [x] `block: string`
            - [x] ... and other relevant personal details.

---

### **Phase 2: Summary Card Data Migration**

This phase involves replacing the data source for the main summary cards.

- [x] **Task 2.1: Implement General Summary Fetching Logic**
    - **Description:** Create a function to fetch and process aggregate data for the summary cards based on a date range.
    - **Sub-tasks:**
        - [x] **File:** `app/utils/fetchFirebaseData.ts`
        - [x] **Create `getWtmSlpSummary(startDate, endDate)` function:**
            - [x] The function will accept `startDate` and `endDate` strings ("YYYY-MM-DD").
            - [x] Perform two separate queries to the `wtm-slp` collection to handle both `form_type` and `type` fields for meetings.
                - [x] Query 1: `where('form_type', '==', 'meetings')`
                - [x] Query 2: `where('type', '==', 'meetings')`
            - [x] Combine the documents from both queries, ensuring no duplicates if a document somehow has both fields.
            - [x] Filter the combined list of documents in-memory based on `dateOfVisit` to fit within the `startDate` and `endDate` range.
            - [x] Process the filtered documents to calculate:
                - [x] `totalMeetings`: The total count of the filtered documents.
                - [x] `totalSlps`: Count of documents where `recommendedPosition === 'SLP'`.
                - [x] `totalOnboarded`: Count of documents where `onboardingStatus === 'Onboarded'`.
            - [x] Return an object: `{ totalMeetings, totalSlps, totalOnboarded }`.

- [x] **Task 2.2: Integrate Summary Data into the UI**
    - **Description:** Update the WTM-SLP page to call the new Firebase function and display the data.
    - **Sub-tasks:**
        - [x] **File:** `app/wtm-slp/page.tsx`
        - [x] Import the `getWtmSlpSummary` function.
        - [x] Remove the old Google Sheets data-fetching function and any related state.
        - [x] Use `useState` to manage the loading state and the summary data (`{ totalMeetings, totalSlps, totalOnboarded }`).
        - [x] Use `useEffect` to call `getWtmSlpSummary` when the component mounts or when the date range filter is updated.
        - [x] Connect the state to the UI components for the summary cards, ensuring they update correctly.

---

### **Phase 3: Assembly Coordinator (AC) View Migration**

This phase focuses on migrating the data for the detailed view of a selected coordinator.

- [x] **Task 3.1: Implement Coordinator List Fetching**
    - **Description:** Create a function to fetch the list of all relevant stakeholders (ACs and individual SLPs).
    - **Sub-tasks:**
        - [x] **File:** `app/utils/fetchFirebaseData.ts`
        - [x] **Create `getWtmSlpStakeholders()` function:**
            - [x] Query the `users` collection: `where('departmentHead', '==', 'Mr. Ravi Pandit - WTM-SLP')`.
            - [x] After fetching, filter the results in-memory to include only users where `role` is "Assembly Coordinator" or "SLP".
            - [x] The function should return an array of `User` objects.

- [x] **Task 3.2: Implement Data Fetching for a Specific AC**
    - **Description:** Create a function to retrieve all work-related entries for a selected coordinator within a date range.
    - **Sub-tasks:**
        - [x] **File:** `app/utils/fetchFirebaseData.ts`
        - [x] **Create `getCoordinatorDetails(uid, startDate, endDate)` function:**
            - [x] It will accept the coordinator's `uid` and the date range.
            - [x] Perform parallel queries on the `wtm-slp` collection, filtering by `userId === uid`.
            - [x] For each form/type (`meetings`, `activity`, `assembly-wa`), perform two queries (one for `form_type`, one for `type`) and combine them, then filter by date.
            - [x] **Assumption:** The coordinator's UID is stored in a field named `userId` in the `wtm-slp` collection. This needs to be verified.
            - [x] Process the fetched documents to structure the data clearly. For example:
                - [x] `meetingsSummary`: `{ meetings: number, slpsAdded: number, onboarded: number }`
                - [x] `activities`: An array of activity objects.
                - [x] `whatsappGroups`: An array of WhatsApp group objects.
            - [x] Return a single, comprehensive object containing the processed data.

- [x] **Task 3.3: Integrate Coordinator Data into the UI**
    - **Description:** Connect the backend fetching logic to the coordinator view on the frontend.
    - **Sub-tasks:**
        - [x] **File:** `app/wtm-slp/page.tsx`
        - [x] Use `useState` to store the list of stakeholders fetched by `getWtmSlpStakeholders()`. Populate the selection dropdown with this list.
        - [x] Use `useState` to store the details of the currently selected coordinator.
        - [x] When a coordinator is selected from the dropdown, call `getCoordinatorDetails()` with their `uid` and the current date range.
        - [x] Update the state with the returned details.
        - [x] Map the data from the state to the respective UI components (personal details, summary cards, activity lists).
        - [x] For any data field that is missing or null, display "--" in the UI as a placeholder.


---

### **Phase 4: Authentication and UI Enhancements**

This phase introduces a complete user authentication system using Firebase and enhances the UI based on new requirements.

- [x] **Task 4.1: Data Preparation for Assembly Dropdown**
    - **Description:** Extract all Assembly Constituency names for Bihar (`BR`) from the `mapping.csv` file. This data is critical for the "Create Account" form.
    - **Sub-tasks:**
        - [x] **Create a data processing script (One-time execution):**
            - [x] **Suggestion:** A simple Node.js or Python script would be efficient.
            - [x] Read `mapping.csv`.
            - [x] Filter rows where the `state_code` column is exactly "BR".
            - [x] Extract the unique values from the `as_name` column.
            - [x] Save this array of names into a new file: `public/data/bihar_assemblies.json`. This allows for easy fetching on the client-side.

- [x] **Task 4.2: Firebase Authentication and User Management**
    - **Description:** Implement a complete authentication flow with a dedicated Login/Signup page and Firestore integration for user data persistence.
    - **Sub-tasks:**
        - [x] **Create the Authentication Page:**
            - [x] **File:** `app/auth/page.tsx` (New file and directory).
            - [x] This component will serve as the entry point for both login and registration.
            - [x] Use `useState` to manage the view (e.g., `view: 'signIn' | 'createAccount'`).
            - [x] Display a "Sign in with Email" button and a bold text link for "Create Account" that toggle the view.

        - [x] **Implement the "Sign In" Flow:**
            - [x] **File:** `app/auth/page.tsx`.
            - [x] When the view is `signIn`, render a form with "Email" and "Password" inputs and a "Sign In" button.
            - [x] On form submission, call Firebase's `signInWithEmailAndPassword` function.
            - [x] Upon successful sign-in, redirect the user to the `/dashboard` page using Next.js's `useRouter`.
            - [x] Display appropriate error messages for failures (e.g., wrong password, user not found).

        - [x] **Implement the "Create Account" Flow:**
            - [x] **File:** `app/auth/page.tsx`.
            - [x] When the view is `createAccount`, render a form with fields for "Email", "Password", "Confirm Password", and a "Select Assemblies" multi-select dropdown.
            - [x] Fetch the list of assemblies from `public/data/bihar_assemblies.json` to populate the dropdown.
            - [x] Add a "Create Account" button.
            - [x] On submission, perform client-side validation (e.g., passwords must match).
            - [x] Call Firebase's `createUserWithEmailAndPassword` function.

        - [x] **Implement User Creation in Firestore:**
            - [x] **Files:** `app/auth/page.tsx` and potentially a helper in `app/utils/firebase.ts`.
            - [x] Upon successful user creation in Firebase Auth, create a new document in the `admin-users` collection in Firestore.
            - [x] The document schema will be:
                - `email: string` (from form)
                - `id: string` (the `uid` returned from Firebase Auth)
                - `createdAt: Timestamp` (use `serverTimestamp()`)
                - `assemblies: string[]` (array of selected assemblies from the form)
                - `role: string` (default to `"zonal-incharge"`)
            - [x] After the Firestore document is created, redirect the user to the `/dashboard` page.
            - [x] Handle any potential errors during the Firestore write operation.
        
        - [x] **Update User Data Model:**
            - [x] **File:** `models/types.ts`
            - [x] Define an `AdminUser` interface to match the new `admin-users` collection schema.

- [x] **Task 4.3: WTM-SLP Dashboard UI Enhancement**
    - **Description:** Modify the "Select Field Coordinator" dropdown on the WTM-SLP dashboard to show the role (AC or SLP) next to each name for better clarity.
    - **Sub-tasks:**
        - [x] **Update Stakeholder Dropdown Rendering:**
            - [x] **File:** `app/wtm-slp/page.tsx`.
            - [x] Locate the `Select` component used for the "Field Coordinator" dropdown.
            - [x] The data for this dropdown is fetched by `getWtmSlpStakeholders()`, which already provides the `role`.
            - [x] Modify the `map` function that generates the `<option>` or equivalent elements.
            - [x] The displayed text for each option should be updated to the format: `${user.name} (${user.role === 'Assembly Coordinator' ? 'AC' : 'SLP'})`.
            - [x] Ensure that only users with the roles "Assembly Coordinator" and "SLP" are displayed in this dropdown, as is the current behavior.

---

## 5. Implementation Summary

All tasks in Phases 4 and 5 have been successfully completed:

### Completed Tasks

1. **Data Preparation for Assembly Dropdown**
   - Created a Node.js script to extract Bihar assembly constituencies from `mapping.csv`
   - Filtered rows with state code "BR" and extracted unique assembly names
   - Saved the data to `public/data/bihar_assemblies.json` for client-side access

2. **Firebase Authentication and User Management**
   - Updated Firebase configuration to include authentication
   - Created a new authentication page with sign-in and registration flows
   - Implemented user creation in Firestore with proper data modeling
   - Added the `AdminUser` interface to the type definitions

3. **WTM-SLP Dashboard UI Enhancement**
   - Modified the Field Coordinator dropdown to display roles (AC or SLP) next to names
   - Updated the component to handle and display the role information
   - Ensured proper formatting and styling of the dropdown items

4. **Authentication Enhancements**
   - Created a LogoutButton component that handles user sign-out
   - Added the logout button to the dashboard for easy access
   - Implemented middleware to protect routes from unauthenticated access
   - Set up cookie-based authentication tokens for persistent sessions

### **Phase 5: Authentication Enhancements**

This phase focuses on improving the authentication flow and adding necessary UI elements for user management.

- [x] **Task 5.1: Add Logout Button**
    - **Description:** Add a logout button to the dashboard for users to sign out.
    - **Sub-tasks:**
        - [x] **Create a Logout Button Component:**
            - [x] **File:** `components/LogoutButton.tsx` (New file).
            - [x] Implement a button that calls Firebase's `signOut` function.
            - [x] Clear the auth token cookie on logout.
            - [x] Redirect the user to the auth page after logout.
        - [x] **Add the Logout Button to the Dashboard:**
            - [x] **File:** `components/DashboardHome.tsx`.
            - [x] Add the LogoutButton component to the top right of the dashboard.

- [x] **Task 5.2: Implement Authentication Protection**
    - **Description:** Ensure that unauthenticated users are redirected to the auth page.
    - **Sub-tasks:**
        - [x] **Create a Middleware for Route Protection:**
            - [x] **File:** `middleware.ts` (New file).
            - [x] Check for the presence of an auth token cookie on each request.
            - [x] Redirect unauthenticated users to the auth page.
            - [x] Allow authenticated users to access protected routes.
        - [x] **Update Auth Page to Set Token:**
            - [x] **File:** `app/auth/page.tsx`.
            - [x] Set an auth token cookie after successful authentication.

### Next Steps

The following areas could be considered for future enhancements:

1. **Authentication Flow Improvements**
   - Add password reset functionality
   - Implement email verification
   - Add more authentication providers (Google, Facebook, etc.)

2. **User Management**
   - Create an admin panel for managing users
   - Add ability to edit user roles and assigned assemblies
   - Implement user profile management

3. **Dashboard Enhancements**
   - Add filtering by assembly constituency
   - Implement data export functionality
   - Create visualizations for better data representation

---

### **Phase 6: Role-Based Access Control and Data Filtering**

This phase introduces a role-based data visibility system, allowing data access to be restricted based on user roles ('Admin' or 'Zonal Incharge') and their assigned assemblies.

- [x] **Task 6.1: Backend - Fetching User Role and Assigned Assemblies**
    - **Description:** Determine the current user's role and their associated assembly constituencies to control data visibility.
    - **Sub-tasks:**
        - [x] **File:** `app/utils/fetchFirebaseData.ts` (New function)
        - [x] **Create `getCurrentAdminUser(uid)` function:**
            - [x] **Description:** Fetches the user's profile from the `admin-users` collection.
            - [x] **Implementation:**
                - [x] Accepts the current user's `uid` as an argument.
                - [x] Queries the `admin-users` collection for a document where `id === uid`.
                - [x] Returns the user document, which includes `role` and the `assemblies` array.
                - [x] This function will be called once upon user login to determine their permissions throughout the session.

- [x] **Task 6.2: Frontend - Dynamic "Assembly" Dropdown in UI**
    - **Description:** Add a new "Assembly" dropdown to the WTM-SLP dashboard and populate it based on the user's role.
    - **Sub-tasks:**
        - [x] **File:** `app/wtm-slp/page.tsx`
        - [x] **Add State for User Role and Assemblies:**
            - [x] Use `useState` to store the current user's role (`admin` or `zonal-incharge`) and their list of assigned assemblies.
            - [x] On component mount, call `getCurrentAdminUser` to populate this state.
        - [x] **Implement the "Assembly" Dropdown:**
            - [x] Add a new `Select` component to the UI, positioned before the "Field Coordinator" dropdown.
            - [x] **For Admins:** Populate the dropdown with all assemblies from `public/data/bihar_assemblies.json`. Add a default option at the top: **"All Assemblies"**.
            - [x] **For Zonal Incharges:** Populate the dropdown only with the assemblies assigned to them (from their `admin-users` profile).

- [x] **Task 6.3: Data Filtering Logic for Summary Cards**
    - **Description:** Update the data-fetching logic for the summary cards to respect the selection in the new "Assembly" dropdown.
    - **Sub-tasks:**
        - [x] **File:** `app/utils/fetchFirebaseData.ts`
        - [x] **Modify `getWtmSlpSummary(startDate, endDate, assemblies)` function:**
            - [x] **Update Signature:** The function will now accept an `assemblies` parameter, which will be an array of assembly names.
            - [x] **Update Query Logic:**
                - [x] If the `assemblies` array is provided and not empty, use a `where('assembly', 'in', assemblies)` clause in the Firestore queries for the `wtm-slp` collection.
                - [x] If the `assemblies` array is empty or not provided (for an Admin selecting "All Assemblies"), the query should not include the assembly filter, thus fetching data from all assemblies.
        - [x] **File:** `app/wtm-slp/page.tsx`
        - [x] **Integrate into UI:**
            - [x] When a Zonal Incharge first loads the page, call `getWtmSlpSummary` with the full list of their assigned assemblies.
            - [x] When any user selects a single assembly from the dropdown, call the function with an array containing just that selected assembly.
            - [x] When an Admin selects "All Assemblies", call the function with an empty array.

- [x] **Task 6.4: Filtering the "Field Coordinator" Dropdown**
    - **Description:** The "Field Coordinator" dropdown must be dynamically populated with users (ACs and SLPs) who belong to the assembly selected in the "Assembly" dropdown.
    - **Sub-tasks:**
        - [x] **File:** `app/utils/fetchFirebaseData.ts`
        - [x] **Modify `getWtmSlpStakeholders(assembly)` function:**
            - [x] **Update Signature:** The function will now require an `assembly` string parameter.
            - [x] **Update Query Logic (Users):**
                - [x] Query the `users` collection where `departmentHead` is 'Mr. Ravi Pandit - WTM-SLP' AND `assembly` matches the provided `assembly` parameter. This will fetch ACs and individual SLPs for that assembly.
        - [x] **Create `getAssociatedSlps(assembly)` function:**
            - [x] **Description:** Fetches SLPs who were created by ACs during meetings, as they do not have accounts in the `users` collection.
            - [x] **Implementation:**
                - [x] Accepts an `assembly` string parameter.
                - [x] Queries the `wtm-slp` collection.
                - [x] Applies the following filters: `where('assembly', '==', assembly)`, `where('recommendedPosition', '==', 'SLP')`, and a filter to ensure it's a meeting entry (`form_type` or `type`).
                - [x] **Assumption:** We will fetch all associated SLPs within an assembly and will not filter by the `handler_id` at this stage. The function will need to handle potential duplicates if an SLP is recommended multiple times.
            - [x] **Returns:** An array of objects, where each object contains the SLP's `name` and the `docId` as their `uid`.
        - [x] **File:** `app/wtm-slp/page.tsx`
        - [x] **Combine and Populate Dropdown:**
            - [x] When an assembly is selected, call both `getWtmSlpStakeholders` and `getAssociatedSlps` with the selected assembly.
            - [x] Combine the results from both functions into a single list.
            - [x] Remove any duplicate entries based on user/SLP name.
            - [x] Populate the "Field Coordinator" dropdown with this combined and filtered list. If no assembly is selected, this dropdown should be disabled or empty.

- [x] **Task 6.5: Updating the Coordinator Details View**
    - **Description:** Ensure that when a coordinator is selected, the details fetched for them are correctly filtered by the selected assembly.
    - **Sub-tasks:**
        - [x] **File:** `app/utils/fetchFirebaseData.ts`
        - [x] **Modify `getCoordinatorDetails(uid, startDate, endDate, assembly)` function:**
            - [x] **Update Signature:** Add the `assembly` parameter.
            - [x] **Update Query Logic:** For all queries against the `wtm-slp` collection within this function, add the clause `where('assembly', '==', assembly)`. This ensures that the metrics (meetings, activities, etc.) shown for a selected coordinator are only for the work they did in the chosen assembly.
            - [x] This change is especially important for coordinators who may work across multiple assemblies but are being viewed under the context of one.

## 6. Implementation Summary

All tasks in Phase 6 have been successfully completed:

### Completed Tasks

1. **Backend Functions for Role-Based Access**
   - Created `getCurrentAdminUser` function to fetch user role and assigned assemblies
   - Updated `getWtmSlpSummary` to filter by assemblies
   - Updated `getWtmSlpStakeholders` to filter by assembly
   - Created `getAssociatedSlps` function to fetch SLPs created during meetings
   - Updated `getCoordinatorDetails` to filter by assembly

2. **Frontend UI Enhancements**
   - Added state management for user role and assemblies
   - Implemented Assembly dropdown in the UI
   - Connected assembly selection to data filtering
   - Updated coordinator dropdown to show only coordinators from the selected assembly
   - Combined regular users and associated SLPs in the coordinator dropdown

3. **Data Filtering Logic**
   - Implemented role-based filtering for Admins vs. Zonal Incharges
   - Added assembly-based filtering for all data queries
   - Ensured proper filtering of coordinator details by assembly

### Next Steps

The following areas could be considered for future enhancements:

1. **UI Improvements**
   - Add visual indicators for the current user's role
   - Improve the assembly selection UI with search functionality for large lists
   - Add a breadcrumb navigation to show the current selection path

2. **Performance Optimizations**
   - Implement pagination for large datasets
   - Add caching for frequently accessed data
   - Optimize queries for better performance

3. **Additional Features**
   - Add export functionality for filtered data
   - Implement batch operations for administrators
   - Add visualization tools for data analysis

---

### **Phase 7: UI/UX Refinement and Bug Fixes**

This phase addresses critical UI/UX issues and data presentation bugs to improve usability and ensure data accuracy.

- [x] **Task 7.1: Resolve UI Layout and Redundancy Issues**
    - **Description:** Clean up the main dashboard view by removing a duplicate header and fixing layout constraints that make the UI feel congested.
    - **Sub-tasks:**
        - [x] **Sub-task 7.1.1: Remove Duplicate Header**
            - **Description:** The page currently renders its own header in addition to the site-wide header from the main layout, resulting in a cluttered look with two "Logout" buttons.
            - **File to Modify:** `app/wtm-slp/page.tsx`
            - **Implementation Steps:**
                1. Open `app/wtm-slp/page.tsx`.
                2. Locate the JSX block that renders the `<h2>WTM-SLP Dashboard</h2>` and the accompanying `<LogoutButton />`.
                3. Delete this entire `div` container. The page will now correctly inherit the single header from `app/layout.tsx`.

        - [x] **Sub-task 7.1.2: Fix Constrained/Padded View**
            - **Description:** The content area, especially the "Member Activities" section, has excessive padding, which constrains the view and makes it look congested.
            - **File to Modify:** `app/wtm-slp/page.tsx`
            - **Implementation Steps:**
                1. Open `app/wtm-slp/page.tsx`.
                2. Inspect the main container `div` that wraps the dashboard content.
                3. Identify and remove any restrictive padding or width classes, such as `p-8`, `px-4`, or `max-w-screen-lg`. The goal is to allow the content to utilize the available width, matching the previous, more open layout.

- [x] **Task 7.2: Correct Data Presentation and Consistency**
    - **Description:** Fix issues related to how data is presented to the user, including duplicate entries in the member list and inconsistent UI styling.
    - **Sub-tasks:**
        - [x] **Sub-task 7.2.1: De-duplicate SLP Member List**
            - **Description:** The list of member activities currently shows duplicate entries for the same person. This needs to be resolved by showing each member only once.
            - **File to Modify:** `app/wtm-slp/page.tsx`
            - **Implementation Steps:**
                1. Locate the `useEffect` hook responsible for fetching and setting the `memberActivities` state.
                2. After fetching the activities, introduce a de-duplication step before calling `setMemberActivities`.
                3. Create a `Map` to store unique members, using the member's `name` as the key.
                4. Iterate through the fetched activities, and for each activity, add the member to the `Map`. If a member with the same name already exists, they will be overwritten, ensuring uniqueness.
                5. Convert the `Map` values back to an array and set this unique list to the `memberActivities` state.

        - [x] **Sub-task 7.2.2: Standardize Member List UI**
            - **Description:** The UI for displaying the "AC's Leaders" (Member Activities) is visually inconsistent with other lists in the application, leading to a confusing user experience.
            - **File to Modify:** `app/wtm-slp/page.tsx`
            - **Implementation Steps:**
                1. Analyze the JSX that maps over the `memberActivities` array to render the list.
                2. Compare its structure and CSS classes to other, correctly styled lists within the application.
                3. Refactor the card component for each member. Adjust the `div` structure, `className` attributes, and element layout to match the application's standard design for such lists.

- [x] **Task 7.3: Restore Assembly Constituency (AC) Data Functionality**
    - **Description:** This is a critical fix to resolve the broken data flow for Assembly Constituency information. The coordinator's assigned assembly currently shows "Unknown," and filtering is not working as intended.
    - **Sub-tasks:**
        - [x] **Sub-task 7.3.1: Fix "Unknown" Assembly for Selected Coordinator**
            - **Description:** When a coordinator is selected, their primary assembly is not displayed correctly because only their ID is being stored, not their full profile.
            - **File to Modify:** `app/wtm-slp/page.tsx`
            - **Implementation Steps:**
                1. Find the `Select` component for the "Field Coordinator" dropdown.
                2. Modify its `onChange` event handler.
                3. In the handler, use the `value` (which is the coordinator's `uid`) to find the complete `user` object from the `stakeholders` array.
                4. Update the `setSelectedCoordinator` state with the entire `user` object, not just the `uid`.
                5. Update the UI element that displays the assembly to render `selectedCoordinator?.assembly || 'N/A'`. This will now display the correct assembly name.

        - [x] **Sub-task 7.3.2: Ensure Coordinator Metrics are Filtered by Assembly**
            - **Description:** The metrics for a selected coordinator (meetings, SLPs added, etc.) are not being filtered by the assembly selected in the "Select Assembly" dropdown.
            - **File to Modify:** `app/wtm-slp/page.tsx`
            - **Implementation Steps:**
                1. Locate the `useEffect` hook that triggers when `selectedCoordinator` or `selectedAssembly` changes.
                2. Inside this hook, ensure that the call to `getCoordinatorDetails` passes the `selectedAssembly` from the state.
                3. The function call should look like: `getCoordinatorDetails(selectedCoordinator.uid, startDate, endDate, selectedAssembly)`.
                4. **Verification:** Confirm in `app/utils/fetchFirebaseData.ts` that the `getCoordinatorDetails` function correctly uses the `assembly` parameter in its Firestore queries to filter the results. This will ensure the stats shown are specific to the work done in that assembly.
