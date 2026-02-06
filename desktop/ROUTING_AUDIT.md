# Routing Logic Audit & Recommendations

## Current Flow Overview

The app follows this routing flow:
1. **LoadingScreen** → Initial loading with language selector
2. **SetupScreen** → Global KB setup (blocking, full-screen)
3. **UserProfileSelector** → User selection/creation
4. **ChatInterface** → Main chat interface (with optional Settings modal)

## Issues Identified

### 1. **Complex State Management** ⚠️ HIGH PRIORITY

**Problem:**
- 11+ state variables that are interdependent
- State can get out of sync (e.g., `setupJustCompleted` flag)
- Multiple boolean flags checking similar conditions

**Current State Variables:**
```typescript
- modelReady
- globalKBReady
- userKBReady (unused?)
- modelPath (unused?)
- isLoading
- showSetupModal
- isGlobalKBSetup
- currentUserId
- showUserSelector
- isCheckingUser
- isCheckingSetup
- setupJustCompleted
```

**Recommendation:**
- Consolidate into a single `AppState` type with clear states:
  ```typescript
  type AppState = 
    | { type: 'loading' }
    | { type: 'setup', step: 'global-kb' }
    | { type: 'user-selection' }
    | { type: 'chat', userId: string, showSettings?: boolean }
  ```

### 2. **Redundant Conditional Renders** ⚠️ MEDIUM PRIORITY

**Problem:**
Multiple if statements checking similar conditions:
- Lines 224-235: Check for `!globalKBReady`
- Lines 238-244: Check for `showUserSelector && !currentUserId`
- Lines 259-265: Fallback check for `!currentUserId`
- Lines 268-275: Another fallback check for `!currentUserId`

**Recommendation:**
- Use a single state machine or switch statement
- Create a `getCurrentView()` function that returns the view to render

### 3. **Race Conditions** ⚠️ HIGH PRIORITY

**Problem:**
- `setupJustCompleted` flag might not prevent race conditions
- Initial `useEffect` checks user before setup is fully determined
- Multiple async operations can complete in any order

**Example Issue:**
```typescript
// Line 124: Checks setupJustCompleted, but this might be stale
if (modelReadyLocal && globalKBReadyLocal && !setupJustCompleted) {
  await checkCurrentUser();
}
```

**Recommendation:**
- Use a ref to track initialization state
- Ensure setup checks complete before user checks
- Add explicit state transitions

### 4. **Duplicate Setup Status Checks** ⚠️ MEDIUM PRIORITY

**Problem:**
- `checkGlobalKB()` and `checkSetupStatus()` both check global KB
- `checkSetupStatus()` is called after user selection but also checks model
- Inconsistent error handling between checks

**Recommendation:**
- Consolidate into a single `checkSetupStatus()` function
- Cache results to avoid redundant backend calls
- Return a single object with all setup status

### 5. **Unclear State Transitions** ⚠️ MEDIUM PRIORITY

**Problem:**
- `handleProceed()` and `handleGlobalKBReady()` both handle setup completion
- Both clear user state and show user selector
- Unclear which function should be called when

**Recommendation:**
- Single function for "setup complete" transition
- Clear state transition functions:
  ```typescript
  transitionToUserSelection()
  transitionToChat(userId)
  transitionToSetup()
  ```

### 6. **Settings Modal Logic Complexity** ⚠️ LOW PRIORITY

**Problem:**
- `useEffect` at line 139 has complex dependencies
- Multiple conditions for when to show/hide settings
- Settings can be opened from multiple places (chat, user selector)

**Recommendation:**
- Extract settings modal logic to a custom hook
- Use a single source of truth for when settings should be visible

### 7. **Missing Error States** ⚠️ MEDIUM PRIORITY

**Problem:**
- No error state if setup fails permanently
- No recovery path if user check fails
- Silent failures in some catch blocks

**Recommendation:**
- Add error state to AppState type
- Show error UI with retry options
- Better error messages for users

### 8. **Unused State Variables** ⚠️ LOW PRIORITY

**Problem:**
- `userKBReady` is declared but never used
- `modelPath` is set but never read

**Recommendation:**
- Remove unused state variables
- Clean up dead code

## Recommended Refactoring

### Phase 1: State Consolidation

Create a state machine approach:

```typescript
type AppView = 
  | { type: 'loading' }
  | { type: 'setup', setupType: 'global-kb' }
  | { type: 'user-selection' }
  | { type: 'chat', userId: string }
  | { type: 'error', message: string, retry?: () => void };

const [appView, setAppView] = useState<AppView>({ type: 'loading' });
```

### Phase 2: Single Source of Truth

Create a `useAppState` hook that manages all routing:

```typescript
function useAppState() {
  const [view, setView] = useState<AppView>({ type: 'loading' });
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  
  // Single function to check setup
  const checkSetup = useCallback(async () => {
    // Check model and KB in parallel
    const [modelReady, kbReady] = await Promise.all([
      checkModel(),
      checkGlobalKB()
    ]);
    
    setSetupStatus({ modelReady, kbReady });
    return { modelReady, kbReady };
  }, []);
  
  // Clear transition functions
  const transitionToUserSelection = useCallback(() => {
    setView({ type: 'user-selection' });
  }, []);
  
  const transitionToChat = useCallback((userId: string) => {
    setView({ type: 'chat', userId });
  }, []);
  
  return {
    view,
    setupStatus,
    checkSetup,
    transitionToUserSelection,
    transitionToChat,
    // ... other transitions
  };
}
```

### Phase 3: Simplified Render Logic

Replace multiple conditionals with a single switch:

```typescript
function App() {
  const { view, setupStatus, ... } = useAppState();
  
  // Single render decision
  switch (view.type) {
    case 'loading':
      return <LoadingScreen onComplete={...} />;
    case 'setup':
      return <SetupScreen ... />;
    case 'user-selection':
      return <UserProfileSelector ... />;
    case 'chat':
      return <ChatInterface userId={view.userId} ... />;
    case 'error':
      return <ErrorScreen ... />;
  }
}
```

## User Experience Improvements

### 1. **Loading States**
- Show specific loading messages ("Checking setup...", "Loading user profiles...")
- Add skeleton screens instead of generic "Loading..."

### 2. **Error Recovery**
- Add retry buttons for failed operations
- Show clear error messages
- Allow users to skip optional setup steps

### 3. **State Persistence**
- Save current view state to localStorage
- Restore state on app restart
- Handle state corruption gracefully

### 4. **Transitions**
- Add smooth transitions between views
- Show progress indicators during state changes
- Prevent rapid clicking during transitions

## Implementation Priority

1. **HIGH**: Fix race conditions and state synchronization
2. **HIGH**: Consolidate duplicate setup checks
3. **MEDIUM**: Refactor to state machine pattern
4. **MEDIUM**: Add error states and recovery
5. **LOW**: Clean up unused code
6. **LOW**: Improve loading/error UX

## Testing Recommendations

1. Test rapid state changes (clicking buttons quickly)
2. Test app restart during different states
3. Test error scenarios (network failures, missing files)
4. Test concurrent async operations
5. Test state persistence across app restarts
