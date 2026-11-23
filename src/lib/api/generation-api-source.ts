// Single source for executable generation request/response schema metadata and OpenAPI output.
// All additions must pass differential request tests and exact-head contract drift checks.
export const generationApiContractSource = {
  "schemaVersion": 1,
  "info": {
    "title": "RenderLab private generation API",
    "version": "1.0.0",
    "description": "Invite-only FIBO image beta. This schema documents existing behavior; it does not activate public API support or change unversioned URLs."
  },
  "schemas": {
    "GenerationRequest": {
      "type": "object",
      "required": [
        "output",
        "inputs"
      ],
      "description": "Current FIBO-only input. Structural JSON Schema plus executable parser refinements documented in x-renderlab-semantic-rules. Unknown properties are tolerated except named forbidden sentinels.",
      "properties": {
        "model": {
          "const": "fibo2-edit-turbo"
        },
        "prompt": {
          "type": "string",
          "description": "Trimmed before validation; at most 8,000 JavaScript UTF-16 code units after trimming and 4,000 Unicode code points for FIBO unless standalone VGL.",
          "x-renderlab-fiboCodePointMax": 4000
        },
        "output": {
          "type": "object",
          "required": [
            "kind",
            "aspectRatio"
          ],
          "properties": {
            "kind": {
              "const": "image"
            },
            "aspectRatio": {
              "enum": [
                "original",
                "1:1",
                "4:3",
                "3:4",
                "16:9",
                "9:16"
              ]
            }
          },
          "additionalProperties": true,
          "not": {
            "anyOf": [
              {
                "required": [
                  "durationSeconds"
                ]
              },
              {
                "required": [
                  "audioEnabled"
                ]
              },
              {
                "required": [
                  "resolution"
                ]
              }
            ]
          }
        },
        "inputs": {
          "type": "array",
          "maxItems": 4,
          "items": {
            "type": "object",
            "required": [
              "role",
              "source"
            ],
            "properties": {
              "alias": {
                "type": "string",
                "pattern": "^image[1-9][0-9]*$",
                "description": "Optional; defaults to imageN by one-based position"
              },
              "role": {
                "type": "string",
                "enum": [
                  "primary-image",
                  "reference"
                ]
              },
              "source": {
                "type": "object",
                "required": [
                  "type",
                  "id"
                ],
                "properties": {
                  "type": {
                    "enum": [
                      "temporary-source",
                      "media-asset"
                    ]
                  },
                  "id": {
                    "type": "string",
                    "minLength": 1,
                    "description": "Opaque owner-scoped source identity; trimmed by runtime parser"
                  }
                },
                "additionalProperties": true
              }
            },
            "additionalProperties": true
          }
        },
        "mask": {
          "type": "object",
          "required": [
            "type",
            "id"
          ],
          "properties": {
            "type": {
              "const": "temporary-source"
            },
            "id": {
              "type": "string",
              "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
            }
          },
          "additionalProperties": false
        },
        "vgl": {
          "type": "string",
          "description": "JSON object serialized to a bounded non-empty string of <=8,192 Unicode code points; attached aliases only."
        },
        "autoVgl": {
          "const": true
        },
        "advanced": {
          "type": "object",
          "properties": {
            "negativePrompt": {
              "type": "string",
              "maxLength": 4000,
              "description": "Also limited to 8,000 UTF-16 code units; FIBO limit 4,000 Unicode code points."
            },
            "seed": {
              "type": "integer",
              "minimum": -9007199254740991,
              "maximum": 9007199254740991
            },
            "steps": {
              "type": "integer",
              "minimum": 1,
              "maximum": 8
            },
            "guidance": {
              "const": 1
            }
          },
          "not": {
            "required": [
              "frameRate"
            ]
          },
          "additionalProperties": true
        }
      },
      "additionalProperties": true,
      "not": {
        "anyOf": [
          {
            "required": [
              "generatedVgl"
            ]
          },
          {
            "required": [
              "json_instruction"
            ]
          }
        ]
      },
      "allOf": [
        {
          "if": {
            "properties": {
              "output": {
                "type": "object",
                "properties": {
                  "aspectRatio": {
                    "const": "original"
                  }
                },
                "required": [
                  "aspectRatio"
                ]
              }
            },
            "required": [
              "output"
            ]
          },
          "then": {
            "properties": {
              "inputs": {
                "minItems": 1
              }
            }
          }
        },
        {
          "if": {
            "required": [
              "mask"
            ]
          },
          "then": {
            "properties": {
              "inputs": {
                "minItems": 1,
                "maxItems": 1
              }
            }
          }
        },
        {
          "if": {
            "required": [
              "autoVgl"
            ]
          },
          "then": {
            "properties": {
              "inputs": {
                "maxItems": 0
              }
            },
            "not": {
              "anyOf": [
                {
                  "required": [
                    "mask"
                  ]
                },
                {
                  "required": [
                    "vgl"
                  ]
                }
              ]
            }
          }
        }
      ],
      "x-renderlab-semantic-rules": [
        "trim-prompt-before-resource-bounds",
        "ordered-input-roles-and-unique-aliases",
        "trim-source-identities-and-default-aliases",
        "distinct-owner-scoped-mask-and-exactly-one-image",
        "vgl-parse-json-object-and-validate-attached-reference-tokens",
        "auto-vgl-requires-nonempty-plain-prompt-and-zero-sources",
        "nonempty-text-or-valid-vgl",
        "all-text-reference-aliases-must-be-attached",
        "original-aspect-requires-an-image",
        "fibo-character-and-tuning-limits"
      ]
    },
    "GenerationJob": {
      "type": "object",
      "required": [
        "id",
        "status",
        "operation",
        "createdAt",
        "updatedAt",
        "outputAssetIds"
      ],
      "properties": {
        "id": {
          "type": "string"
        },
        "status": {
          "enum": [
            "queued",
            "preparing",
            "running",
            "cancelling",
            "persisting",
            "succeeded",
            "failed",
            "cancelled"
          ]
        },
        "operation": {
          "enum": [
            "create-image",
            "edit-image",
            "create-video",
            "animate-image",
            "upscale-image"
          ]
        },
        "createdAt": {
          "type": "string"
        },
        "updatedAt": {
          "type": "string"
        },
        "outputAssetIds": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "error": {
          "type": "object",
          "required": [
            "code",
            "message"
          ],
          "properties": {
            "code": {
              "type": "string"
            },
            "message": {
              "type": "string"
            }
          },
          "additionalProperties": true
        }
      },
      "additionalProperties": true
    },
    "GenerationCapabilities": {
      "type": "object",
      "required": [
        "available"
      ],
      "properties": {
        "available": {
          "type": "boolean"
        },
        "fiboAvailable": {
          "const": true
        },
        "fiboMaskAvailable": {
          "const": true
        },
        "fiboAutoVglAvailable": {
          "const": true
        }
      },
      "additionalProperties": false,
      "description": "Availability flags are present only when true; never invent explicit false flags."
    },
    "GenerationSuccess": {
      "type": "object",
      "required": [
        "ok",
        "job"
      ],
      "properties": {
        "ok": {
          "const": true
        },
        "job": {
          "$ref": "#/components/schemas/GenerationJob"
        }
      },
      "additionalProperties": true
    },
    "GenerationError": {
      "type": "object",
      "required": [
        "ok",
        "error"
      ],
      "properties": {
        "ok": {
          "const": false
        },
        "error": {
          "type": "object",
          "required": [
            "code",
            "message"
          ],
          "properties": {
            "code": {
              "type": "string"
            },
            "message": {
              "type": "string"
            },
            "details": {
              "type": "object",
              "additionalProperties": {
                "type": "string"
              }
            }
          },
          "additionalProperties": true
        }
      },
      "additionalProperties": true
    }
  },
  "domainErrors": {
    "submit": [
      "invalid_request",
      "generation_access_denied",
      "generation_disabled",
      "generation_active_limit_reached",
      "generation_rate_limit_reached",
      "generation_backend_unavailable",
      "generation_submission_failed"
    ],
    "cancel": [
      "job_not_found",
      "cancel_not_available",
      "generation_backend_unavailable"
    ],
    "retry": [
      "job_not_found",
      "retry_not_available",
      "generation_access_denied",
      "generation_disabled",
      "generation_active_limit_reached",
      "generation_rate_limit_reached",
      "generation_backend_unavailable",
      "generation_submission_failed"
    ],
    "runAgain": [
      "job_not_found",
      "run_again_not_available",
      "generation_access_denied",
      "generation_disabled",
      "generation_active_limit_reached",
      "generation_rate_limit_reached",
      "generation_backend_unavailable",
      "generation_submission_failed"
    ]
  },
  "endpoints": [
    {
      "path": "/api/generation/jobs",
      "method": "get",
      "operationId": "getGenerationCapabilities",
      "summary": "Current image-generation capability flags",
      "success": {
        "200": "GenerationCapabilities"
      },
      "errors": {},
      "description": "Closed-beta capability discovery, with server feature flags emitted only when true."
    },
    {
      "path": "/api/generation/jobs",
      "method": "post",
      "operationId": "submitGenerationJob",
      "summary": "Submit a FIBO image generation",
      "request": "GenerationRequest",
      "success": {
        "202": "GenerationSuccess"
      },
      "errors": {
        "400": [
          "invalid_request"
        ],
        "401": [
          "authentication_required"
        ],
        "403": [
          "cross_origin_request_blocked",
          "generation_access_denied"
        ],
        "429": [
          "generation_active_limit_reached",
          "generation_rate_limit_reached"
        ],
        "502": [
          "generation_submission_failed"
        ],
        "503": [
          "generation_disabled",
          "generation_backend_unavailable"
        ]
      },
      "description": "Request-level replay has no Idempotency-Key guarantee: repeating a valid POST may create a distinct job. Durable per-job outbox replay is separately deduplicated."
    },
    {
      "path": "/api/generation/jobs/{jobId}",
      "method": "get",
      "operationId": "getGenerationJob",
      "summary": "Read or reconcile one owner-scoped job",
      "success": {
        "200": "GenerationSuccess"
      },
      "errors": {
        "400": [
          "invalid_request"
        ],
        "401": [
          "authentication_required"
        ],
        "404": [
          "job_not_found"
        ],
        "503": [
          "generation_backend_unavailable"
        ]
      },
      "description": "May trigger bounded owner-scoped reconciliation; no guarantee of background settlement for users who never return."
    },
    {
      "path": "/api/generation/jobs/{jobId}/cancel",
      "method": "post",
      "operationId": "cancelGenerationJob",
      "summary": "Request a job cancellation",
      "success": {
        "200": "GenerationSuccess",
        "202": "GenerationSuccess"
      },
      "errors": {
        "400": [
          "invalid_request"
        ],
        "401": [
          "authentication_required"
        ],
        "403": [
          "cross_origin_request_blocked"
        ],
        "404": [
          "job_not_found"
        ],
        "409": [
          "cancel_not_available"
        ],
        "503": [
          "generation_backend_unavailable"
        ]
      },
      "description": "200 when cancelled and 202 while cancellation is pending; repeating a completed cancellation observes the settled status."
    },
    {
      "path": "/api/generation/jobs/{jobId}/retry",
      "method": "post",
      "operationId": "retryGenerationJob",
      "summary": "Retry a failed generation as a new job",
      "success": {
        "202": "GenerationSuccess"
      },
      "errors": {
        "400": [
          "invalid_request"
        ],
        "401": [
          "authentication_required"
        ],
        "403": [
          "cross_origin_request_blocked",
          "generation_access_denied"
        ],
        "404": [
          "job_not_found"
        ],
        "409": [
          "retry_not_available"
        ],
        "429": [
          "generation_active_limit_reached",
          "generation_rate_limit_reached"
        ],
        "502": [
          "generation_submission_failed"
        ],
        "503": [
          "generation_disabled",
          "generation_backend_unavailable"
        ]
      },
      "description": "Requires a failed eligible original; creates a new job. Repeated POST can create multiple new attempts; no request idempotency key."
    },
    {
      "path": "/api/generation/jobs/{jobId}/run-again",
      "method": "post",
      "operationId": "runAgainGenerationJob",
      "summary": "Re-run a succeeded generation as a new job",
      "success": {
        "202": "GenerationSuccess"
      },
      "errors": {
        "400": [
          "invalid_request"
        ],
        "401": [
          "authentication_required"
        ],
        "403": [
          "cross_origin_request_blocked",
          "generation_access_denied"
        ],
        "404": [
          "job_not_found"
        ],
        "409": [
          "run_again_not_available"
        ],
        "429": [
          "generation_active_limit_reached",
          "generation_rate_limit_reached"
        ],
        "502": [
          "generation_submission_failed"
        ],
        "503": [
          "generation_disabled",
          "generation_backend_unavailable"
        ]
      },
      "description": "Requires a succeeded eligible original; creates a new job; repeated calls are not request-idempotent."
    }
  ],
  "idempotency": {
    "request": "No Idempotency-Key is accepted or promised; repeated POST submissions can create new job IDs.",
    "dispatch": "An accepted job uses a durable outbox with bounded per-job replay protection; not exactly-once provider execution.",
    "finalization": "Unique output index and owner-return recovery converge on one durable media row; storage writes need not be exactly once.",
    "cancellation": "Terminal replay cannot reopen the original job; repeated cancellation observes or rejects it according to status."
  },
  "versioning": {
    "document": "1.0.0",
    "policy": "Major for breaking request/response/status/error semantics; minor for backward-compatible optional fields/endpoints; patch for corrections that do not change behavior. Version is documentation metadata, not a routed /v1 public API.",
    "breakingChange": "Changing a major version requires explicit engineering approval and separate runtime release qualification."
  }
} as const;
