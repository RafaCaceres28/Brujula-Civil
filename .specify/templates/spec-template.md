# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`
**Created**: [DATE]
**Status**: Draft
**Input**: User description: "$ARGUMENTS"

## Constitution Alignment (mandatory)

- **Verify-First Evidence**: [List files/docs/commands used to validate assumptions]
- **Contract Impact**: [List `types`/`schemas` to create or modify, or state N/A]
- **Security Impact**: [Secrets, auth, redirect, PII, or error-safety considerations]
- **Quality Gate Plan**: [`pnpm lint`, `pnpm typecheck`, `pnpm test:run` execution scope]

## User Scenarios & Testing (mandatory)

User stories MUST be prioritized and independently testable.

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain user and business value]
**Independent Test**: [Describe how this slice can be validated on its own]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain user and business value]
**Independent Test**: [Describe how this slice can be validated on its own]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain user and business value]
**Independent Test**: [Describe how this slice can be validated on its own]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

## Edge Cases

- What happens when [boundary condition]?
- How does the system handle [error scenario]?
- What happens when validation fails for external/untrusted input?
- What is the safe fallback for invalid redirect/navigation targets?

## Requirements (mandatory)

### Functional Requirements

- **FR-001**: System MUST [specific capability]
- **FR-002**: System MUST validate all untrusted input at the boundary.
- **FR-003**: System MUST keep business logic outside UI rendering components.
- **FR-004**: System MUST expose only domain-safe error messages to end users.
- **FR-005**: System MUST preserve backward-compatible behavior or document migration impact.

### Key Entities (include if feature involves data)

- **[Entity 1]**: [What it represents, key attributes without implementation details]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Success Criteria (mandatory)

### Measurable Outcomes

- **SC-001**: [User can complete primary flow with defined target completion rate/time]
- **SC-002**: [No regression in mandatory quality gates for impacted scope]
- **SC-003**: [At least one independent user story can ship as MVP]
- **SC-004**: [Security or data handling constraints are met without critical findings]
