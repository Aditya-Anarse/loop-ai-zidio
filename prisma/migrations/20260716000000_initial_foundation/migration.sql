CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE "WorkspaceRole" AS ENUM ('ADMIN', 'ANALYST', 'VIEWER');
CREATE TYPE "FeedbackSource" AS ENUM ('MANUAL', 'CSV', 'SIMULATED');
CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED');
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'GENERATING', 'READY', 'FAILED');

CREATE TABLE "workspaces" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "name" VARCHAR(120) NOT NULL, "slug" VARCHAR(140) NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL, CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id"));
CREATE TABLE "profiles" ("id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "full_name" VARCHAR(160), "role" "WorkspaceRole" NOT NULL DEFAULT 'ADMIN', "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL, CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"));
CREATE TABLE "feedback" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "workspace_id" UUID NOT NULL, "content" TEXT NOT NULL, "source" "FeedbackSource" NOT NULL, "sentiment" "Sentiment", "metadata" JSONB NOT NULL DEFAULT '{}', "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL, CONSTRAINT "feedback_pkey" PRIMARY KEY ("id"));
CREATE TABLE "themes" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "workspace_id" UUID NOT NULL, "name" VARCHAR(180) NOT NULL, "description" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL, CONSTRAINT "themes_pkey" PRIMARY KEY ("id"));
CREATE TABLE "feedback_themes" ("feedback_id" UUID NOT NULL, "theme_id" UUID NOT NULL, CONSTRAINT "feedback_themes_pkey" PRIMARY KEY ("feedback_id", "theme_id"));
CREATE TABLE "reports" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "workspace_id" UUID NOT NULL, "title" VARCHAR(200) NOT NULL, "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT', "content" JSONB, "generated_at" TIMESTAMPTZ, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL, CONSTRAINT "reports_pkey" PRIMARY KEY ("id"));
CREATE TABLE "embeddings" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "workspace_id" UUID NOT NULL, "feedback_id" UUID, "content" TEXT NOT NULL, "vector" vector, "metadata" JSONB NOT NULL DEFAULT '{}', "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "embeddings_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");
CREATE INDEX "profiles_workspace_id_idx" ON "profiles"("workspace_id");
CREATE INDEX "feedback_workspace_id_submitted_at_idx" ON "feedback"("workspace_id", "submitted_at" DESC);
CREATE INDEX "feedback_workspace_id_sentiment_idx" ON "feedback"("workspace_id", "sentiment");
CREATE UNIQUE INDEX "themes_workspace_id_name_key" ON "themes"("workspace_id", "name");
CREATE INDEX "themes_workspace_id_idx" ON "themes"("workspace_id");
CREATE INDEX "reports_workspace_id_created_at_idx" ON "reports"("workspace_id", "created_at" DESC);
CREATE INDEX "embeddings_workspace_id_idx" ON "embeddings"("workspace_id");
CREATE INDEX "embeddings_feedback_id_idx" ON "embeddings"("feedback_id");

ALTER TABLE "profiles" ADD CONSTRAINT "profiles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;
ALTER TABLE "themes" ADD CONSTRAINT "themes_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;
ALTER TABLE "feedback_themes" ADD CONSTRAINT "feedback_themes_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE CASCADE;
ALTER TABLE "feedback_themes" ADD CONSTRAINT "feedback_themes_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "themes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feedback_themes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "embeddings" ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_workspace_id() RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT workspace_id FROM public.profiles WHERE id = auth.uid() $$;
CREATE POLICY "workspace isolation" ON "profiles" USING (id = auth.uid());
CREATE POLICY "workspace isolation" ON "feedback" USING (workspace_id = public.current_workspace_id()) WITH CHECK (workspace_id = public.current_workspace_id());
CREATE POLICY "workspace isolation" ON "themes" USING (workspace_id = public.current_workspace_id()) WITH CHECK (workspace_id = public.current_workspace_id());
CREATE POLICY "workspace isolation" ON "reports" USING (workspace_id = public.current_workspace_id()) WITH CHECK (workspace_id = public.current_workspace_id());
CREATE POLICY "workspace isolation" ON "embeddings" USING (workspace_id = public.current_workspace_id()) WITH CHECK (workspace_id = public.current_workspace_id());
CREATE POLICY "workspace isolation" ON "feedback_themes" USING (EXISTS (SELECT 1 FROM public.feedback f WHERE f.id = feedback_id AND f.workspace_id = public.current_workspace_id()));

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_workspace_id UUID; workspace_slug TEXT;
BEGIN
  workspace_slug := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(new.id::text, 1, 8);
  INSERT INTO public.workspaces (name, slug, updated_at) VALUES (coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) || '''s Workspace', workspace_slug, now()) RETURNING id INTO new_workspace_id;
  INSERT INTO public.profiles (id, workspace_id, full_name, role, updated_at) VALUES (new.id, new_workspace_id, new.raw_user_meta_data->>'full_name', 'ADMIN', now());
  RETURN new;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
