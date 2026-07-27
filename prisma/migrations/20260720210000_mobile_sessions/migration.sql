-- Additive mobile authentication sessions. Browser NextAuth sessions remain unchanged.
CREATE TABLE "MobileSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "passwordVersion" TEXT NOT NULL,
    "deviceName" TEXT,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "MobileSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobileSession_refreshTokenHash_key" ON "MobileSession"("refreshTokenHash");
CREATE INDEX "MobileSession_userId_revokedAt_idx" ON "MobileSession"("userId", "revokedAt");
CREATE INDEX "MobileSession_expiresAt_idx" ON "MobileSession"("expiresAt");

ALTER TABLE "MobileSession"
ADD CONSTRAINT "MobileSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
