ALTER TABLE "Artifact"
  ADD COLUMN "fulfillmentId" uuid,
  ADD COLUMN "stepId" text;

ALTER TABLE "Artifact"
  ADD CONSTRAINT "Artifact_fulfillmentId_Fulfillment_id_fk"
  FOREIGN KEY ("fulfillmentId")
  REFERENCES "public"."Fulfillment"("id")
  ON DELETE SET NULL
  ON UPDATE NO ACTION;
