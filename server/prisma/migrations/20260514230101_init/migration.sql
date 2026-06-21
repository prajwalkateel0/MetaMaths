-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'teacher', 'student');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('waiting', 'active', 'paused', 'ended');

-- CreateEnum
CREATE TYPE "SessionMode" AS ENUM ('live', 'async');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('pending', 'active', 'removed');

-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard', 'adaptive');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('mcq', 'true_false', 'numeric', 'short_answer', 'fill_blank');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('csv_upload', 'api_riot', 'api_opendota', 'api_pandascore', 'google_drive');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ip" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classrooms" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keyStage" TEXT,
    "joinCode" TEXT NOT NULL,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classroom_members" (
    "classroomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classroom_members_pkey" PRIMARY KEY ("classroomId","studentId")
);

-- CreateTable
CREATE TABLE "classroom_charts" (
    "classroomId" TEXT NOT NULL,
    "chartId" TEXT NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classroom_charts_pkey" PRIMARY KEY ("classroomId","chartId")
);

-- CreateTable
CREATE TABLE "datasets" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" "SourceType" NOT NULL,
    "sourceMetadata" JSONB,
    "schema" JSONB NOT NULL,
    "rowCount" INTEGER,
    "tags" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "refreshedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_rows" (
    "id" BIGSERIAL NOT NULL,
    "datasetId" TEXT NOT NULL,
    "row" JSONB NOT NULL,
    "rowIndex" INTEGER,

    CONSTRAINT "dataset_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charts" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT,
    "ownerId" TEXT NOT NULL,
    "title" TEXT,
    "chartType" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "annotations" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "charts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "classroomId" TEXT,
    "title" TEXT NOT NULL,
    "topic" TEXT,
    "difficulty" "Difficulty",
    "settings" JSONB,
    "status" "QuizStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" JSONB NOT NULL,
    "tolerance" DOUBLE PRECISION,
    "points" INTEGER NOT NULL DEFAULT 1,
    "timeLimitSec" INTEGER,
    "dataReference" JSONB,
    "chartId" TEXT,
    "generated" BOOLEAN NOT NULL DEFAULT false,
    "generatorMeta" JSONB,
    "orderIndex" INTEGER,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'waiting',
    "mode" "SessionMode" NOT NULL DEFAULT 'live',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "state" JSONB,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "isCorrect" BOOLEAN,
    "pointsAwarded" INTEGER,
    "timeTakenMs" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_joinCode_key" ON "classrooms"("joinCode");

-- CreateIndex
CREATE INDEX "dataset_rows_datasetId_idx" ON "dataset_rows"("datasetId");

-- CreateIndex
CREATE UNIQUE INDEX "answers_sessionId_questionId_studentId_key" ON "answers"("sessionId", "questionId", "studentId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_members" ADD CONSTRAINT "classroom_members_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_members" ADD CONSTRAINT "classroom_members_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_charts" ADD CONSTRAINT "classroom_charts_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_charts" ADD CONSTRAINT "classroom_charts_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "charts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_rows" ADD CONSTRAINT "dataset_rows_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charts" ADD CONSTRAINT "charts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charts" ADD CONSTRAINT "charts_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "charts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
