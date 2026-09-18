const n = (k, d) => {
  const v = Number.parseInt(process.env[k] || "", 10);
  return Number.isFinite(v) && v > 0 ? v : d;
};

export const config = {
  region: process.env.FUNCTIONS_REGION || "asia-southeast1",
  corsOrigins: new Set(
    (
      process.env.CORS_ORIGINS ||
      "https://my.sytacle.com,https://sytacle.com,https://www.sytacle.com,https://console.cloud.sytacle.com,https://cloud.sytacle.com,http://localhost:5173,http://localhost:3000"
    )
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
  sso: {
    origins: new Set(
      (
        process.env.SSO_ALLOWED_ORIGINS ||
        "https://sytacle.com,https://my.sytacle.com,https://www.sytacle.com,http://localhost:3000,http://localhost:5173"
      )
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  },
  oauth: {
    codeTtl: n("OAUTH_CODE_TTL_SECONDS", 300),
    accessTtl: n("OAUTH_ACCESS_TOKEN_TTL_SECONDS", 3600),
    refreshTtl: n("OAUTH_REFRESH_TOKEN_TTL_SECONDS", 2592000),
    scopes: new Set(["openid", "profile", "email", "account"]),
  },
  plans: [
    "free",
    "basic",
    "family",
    "family_1",
    "family_2",
    "family_3",
    "student",
    "enterprise",
    "free_trial",
  ],
  subscription: {
    plans: {
      free: {
        features: {
          storage: {
            limit: 250 * 1024 * 1024, // 250 MB
            access: {
              photos: true,
              videos: false,
              files: false,
            },
          },
          ai: {
            access: false,
            credit_limit: 0, // 0 credits
          },
          family: {
            allowed_members: 0,
            access: {
              ai: false,
              photos: false,
              videos: false,
              files: false,
            },
          },
        },
      },
      basic: {
        features: {
          storage: {
            limit: 1024 * 1024 * 1024, // 1 GB
            access: {
              photos: true,
              videos: true,
              files: true,
            },
          },
          ai: {
            access: true,
            credit_limit: 10, // 10 credits
          },
          family: {
            allowed_members: 2,
            access: {
              ai: true,
              photos: true,
              videos: true,
              files: true,
            },
          },
        },
      },
      family: {
        features: {
          storage: {
            limit: 5 * 1024 * 1024 * 1024, // 5 GB
            access: {
              photos: true,
              videos: true,
              files: true,
            },
          },
          ai: {
            access: true,
            credit_limit: 25, // 25 credits
          },
          family: {
            allowed_members: 5,
            access: {
              ai: true,
              photos: true,
              videos: true,
              files: true,
            },
          },
        },
      },
      family_1: {
        features: [
          {
            storage: {
              limit: 8 * 1024 * 1024 * 1024, // 8 GB
              access: {
                photos: true,
                videos: true,
                files: true,
              },
            },
            ai: {
              access: true,
              credit_limit: 25, // 25 credits
            },
            family: {
              allowed_members: 5,
              access: {
                ai: true,
                photos: true,
                videos: true,
                files: true,
              },
            },
          },
        ],
      },
      family_2: {
        features: {
          storage: {
            limit: 10 * 1024 * 1024 * 1024, // 10 GB
            access: {
              photos: true,
              videos: true,
              files: true,
            },
          },
          ai: {
            access: true,
            credit_limit: 25, // 25 credits
          },
          family: {
            allowed_members: 6,
            access: {
              ai: true,
              photos: true,
              videos: true,
              files: true,
            },
          },
        },
      },
      family_3: {
        features: {
          storage: {
            limit: 12 * 1024 * 1024 * 1024, // 12 GB
            access: {
              photos: true,
              videos: true,
              files: true,
            },
          },
          ai: {
            access: true,
            credit_limit: 25, // 25 credits
          },
          family: {
            allowed_members: 8,
            access: {
              ai: true,
              photos: true,
              videos: true,
              files: true,
            },
          },
        },
      },
      student: {
        features: {
          storage: {
            limit: 500 * 1024 * 1024, // 500 MB
            access: {
              photos: true,
              videos: true,
              files: true,
            },
          },
          ai: {
            access: false,
            credit_limit: 0, // 0 credits
          },
          family: {
            allowed_members: 0,
            access: {
              ai: false,
              photos: false,
              videos: false,
              files: false,
            },
          },
        },
      },
      enterprise: {
        features: {
          storage: {
            limit: 20 * 1024 * 1024 * 1024, // 20 GB
            access: {
              photos: true,
              videos: true,
              files: true,
            },
          },
          ai: {
            access: true,
            credit_limit: 100, // 100 credits
          },
          family: {
            allowed_members: 10,
            access: {
              ai: true,
              photos: true,
              videos: true,
              files: true,
            },
          },
        },
      },
      free_trial: {
        features: {
          storage: {
            limit: 250 * 1024 * 1024, // 250 MB
            access: {
              photos: true,
              videos: true,
              files: true,
            },
          },
          ai: {
            access: true,
            credit_limit: 5, // 5 credits
          },
          family: {
            allowed_members: 1,
            access: {
              ai: true,
              photos: false,
              videos: false,
              files: false,
            },
          },
        },
      },
    },
  },
};
