# Sweet Angel Bakery - System Diagrams

Unified Impact Diagrams following Diagram Driven Development (DDD) principles. All diagrams connect Front-Stage (user experience) to Back-Stage (technical implementation) with clear impact annotations.

## Directory Structure

```
ai/diagrams/
├── README.md                    # This file - index of all diagrams
├── features/                    # Feature-specific user flows
├── architecture/                # System architecture diagrams
├── journeys/                    # User journey sequences
├── tests/                       # Test coverage and strategy
└── refactoring/                 # Before/After improvements
```

## Architecture Diagrams

- [Complete Database Schema](architecture/arch-complete-database-schema.md) - Complete overview of 21+ tables supporting e-commerce, delivery management, loyalty programs, and content scheduling
- [Database Timezone Handling](architecture/arch-database-timezone-handling.md) - Ensures all users see correct dates and scheduled content by storing UTC in database and operating in Mountain Time for business logic

## Diagram Principles

Every diagram in this directory follows DDD methodology:

✅ **Shows both stages**: Front-Stage (user experience) AND Back-Stage (implementation)
✅ **Impact annotations**: Every technical component explains user value
✅ **Error paths**: Shows what happens when things go wrong
✅ **User-centric**: User actions are entry points, outcomes are clear
✅ **No custom colors**: Except `#90EE90` for highlighting changes in Before/After diagrams

## Creating New Diagrams

1. Read `.claude/skills/diagram/references/DDD_PRINCIPLES.md` for methodology
2. Read `.claude/skills/diagram/references/CREATE.md` for creation guide
3. Choose appropriate directory (features/, architecture/, etc.)
4. Follow file naming: `{type}-{descriptive-name}.md`
5. Include impact annotations on all Back-Stage components
6. Update this README with new diagram entry

## Related Documentation

- `.claude/skills/diagram/` - Full DDD skill documentation
- `.claude/skills/timezone/` - Timezone handling patterns (referenced in arch-database-timezone-handling.md)

---

**Last Updated:** 2025-11-24
