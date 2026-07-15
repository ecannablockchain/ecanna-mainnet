-- Marketing website accounts (register / login); stored in the same SQL Server as the indexer.
IF OBJECT_ID(N'dbo.SiteUser', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[SiteUser] (
        [id] NVARCHAR(1000) NOT NULL,
        [email] NVARCHAR(1000) NOT NULL,
        [passwordHash] NVARCHAR(1000) NOT NULL,
        [displayName] NVARCHAR(1000) NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [SiteUser_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL CONSTRAINT [SiteUser_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [SiteUser_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [SiteUser_email_key] UNIQUE NONCLUSTERED ([email])
    );
END;
