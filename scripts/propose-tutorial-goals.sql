-- ============================================================================
-- PROPOSED TUTORIAL GOAL MIGRATION (DRY RUN ONLY - DO NOT RUN WITHOUT APPROVAL)
-- ============================================================================
-- This script contains the proposed UPDATE statements to align existing tutorials
-- with canonical global goal slugs.
-- NOTE: "Linear Equation" (cmtyxmxpb000gxponiujipccr) is EXCLUDED pending human decision.
-- ============================================================================

BEGIN;

-- 1. Agentic Engineering: Zero to Hero (Fix misclassified UPSC tag -> skills)
UPDATE "Course"
SET "technology" = 'skills'
WHERE "id" = 'cmuqkq1om0001xpk9k093hizv';

-- 2. Agentic AI Engineer: Zero to Hero
UPDATE "Course"
SET "technology" = 'skills,data-science'
WHERE "id" = 'cmupwnrmg0029xpm65l3xcs5w';

-- 3. Prompt Engineering Masterclass
UPDATE "Course"
SET "technology" = 'skills,data-science'
WHERE "id" = 'cmuptv0k30000xpm67277hgre';

-- 4. GenAI Engineer Masterclass stubs & full courses
UPDATE "Course"
SET "technology" = 'skills,data-science'
WHERE "id" IN (
    'cmupgipy2000pxpkdaatz6ze3',
    'cmupgbhas000oxpkdvx0t8al9',
    'cmupd5tqm0000xp82opsg6zeg',
    'cmuoiesld002bxpky14svrsag',
    'cmujmeqp9001uxp8va17e8vt6'
);

-- 5. Imported Tutorial Masterclass packages
UPDATE "Course"
SET "technology" = 'skills,data-science'
WHERE "id" IN (
    'cmuoi9jfa001kxpkyw6v81fvr',
    'cmuohw3x8000txpkyu96ur06v',
    'cmuohns24000sxpky2uizkhk0',
    'cmuohm1aa000rxpkyttb5kvpw',
    'cmuohb9gk0000xpkywru07w9r'
);

-- 6. Python Tutorials
UPDATE "Course"
SET "technology" = 'skills,data-science'
WHERE "id" IN (
    'cmuiolbiy0004xp0521yw6v53',
    'cmtysle1o0000xpgzgh77thhk'
);

-- 7. Foundations of C
UPDATE "Course"
SET "technology" = 'skills'
WHERE "id" = 'cmtyt5drw0002xpon3e8pyueu';

-- 8. General AI / Deep Learning courses
UPDATE "Course"
SET "technology" = 'skills,data-science'
WHERE "id" IN (
    'cmiixtaz40000xpdblykjk4m4',
    'cmii4rwbt0001xphj570fmrle',
    'cmii4ogd90000xphjzqbm6mwq'
);

-- 9. PENDING HUMAN DECISION (DO NOT UPDATE AUTOMATICALLY):
-- 'cmtyxmxpb000gxponiujipccr' - "This is 3rd Course" (Linear Equation)
-- Requires instructor confirmation for target class (Class 9th, 10th, or IIT JEE).

-- ROLLBACK by default until explicit approval
ROLLBACK;
