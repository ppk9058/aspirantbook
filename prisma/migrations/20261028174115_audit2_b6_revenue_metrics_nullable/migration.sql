-- B6: MRR, ARR and churn rate were fabricated, not measured.
--
-- MRR was "number of MONTHLY subscribers * 9.99" (a constant that no customer
-- was charged), ARR was that times twelve, and churn counted PAST_DUE
-- subscriptions as cancellations. Subscription has neither a price nor a status
-- history, so these three numbers cannot be derived; they become nullable and
-- the values already written by the old code are cleared rather than left to be
-- read as facts.

-- AlterTable
ALTER TABLE "RevenueAnalytics" ALTER COLUMN "mrr" DROP NOT NULL,
ALTER COLUMN "mrr" DROP DEFAULT,
ALTER COLUMN "arr" DROP NOT NULL,
ALTER COLUMN "arr" DROP DEFAULT,
ALTER COLUMN "churnRate" DROP NOT NULL,
ALTER COLUMN "churnRate" DROP DEFAULT;

-- Clear the previously fabricated values (0 was written by the default, so the
-- old aggregation results are exactly the rows that were recomputed).
UPDATE "RevenueAnalytics" SET "mrr" = NULL, "arr" = NULL, "churnRate" = NULL;
