export default {
  "name": "RivetFlow",
  "tagline": "Autonomous enterprise operations",
  "accent": "#ed9057",
  "icon": "⬡",
  "sections": [
    {"id":"agent","label":"Agent Control","custom":"agent"},
    {"id":"decisions","label":"SLA Control","custom":"decisions"},
    {"id":"ops","label":"API Activity","custom":"ops"},
    {"id":"studio","label":"Execution Map","custom":"studio"},
    {
      "id": "workflows",
      "label": "Workflows",
      "endpoint": "/api/workflows",
      "fields": [
        {
          "name": "name",
          "type": "text"
        },
        {
          "name": "description",
          "type": "textarea"
        },
        {
          "name": "definition",
          "type": "json",
          "default": {
            "steps": [
              {
                "name": "Intake",
                "kind": "simulate",
                "simulated_result": "Request validated"
              },
              {
                "name": "Review",
                "kind": "ai",
                "instruction": "Classify whether this request warrants manual approval and summarize the rationale."
              },
              {
                "name": "Manager sign-off",
                "kind": "approval"
              },
              {
                "name": "Complete",
                "kind": "simulate",
                "simulated_result": "Processing simulated; no external system modified"
              }
            ]
          }
        }
      ],
      "columns": [
        "name",
        "description",
        "created_at"
      ],
      "action": {
        "title": "Launch workflow",
        "endpoint": "/api/workflows/{id}/start",
        "input": [
          {
            "name": "context",
            "type": "json",
            "default": {
              "request_id": "REQ-001",
              "amount_usd": 125,
              "reason": "Duplicate charge"
            }
          }
        ]
      }
    },
    {
      "id": "runs",
      "label": "Executions",
      "endpoint": "/api/runs",
      "columns": [
        "workflow",
        "status",
        "cursor",
        "created_at"
      ],
      "action": {
        "title": "Advance one step",
        "endpoint": "/api/runs/{id}/advance",
        "input": []
      }
    },
    {
      "id": "approvals",
      "label": "Approvals",
      "endpoint": "/api/approvals",
      "columns": [
        "run_id",
        "status",
        "step_index",
        "created_at"
      ],
      "action": {
        "title": "Decide approval",
        "endpoint": "/api/approvals/{id}/resolve",
        "input": [
          {
            "name": "decision",
            "type": "select",
            "options": [
              "approved",
              "rejected"
            ]
          },
          {
            "name": "note",
            "type": "textarea"
          }
        ]
      }
    },
    {
      "id": "events",
      "label": "Operational Audit",
      "endpoint": "/api/operational-events",
      "columns": [
        "workflow",
        "message",
        "severity",
        "step_index",
        "created_at"
      ]
    },
    {
      "id": "governance",
      "label": "Workflow Governance",
      "custom": "control"
    },
    {
      "id": "recovery",
      "label": "Recovery Queue",
      "endpoint": "/api/recovery",
      "columns": [
        "workflow",
        "cursor",
        "step_kind",
        "updated_at"
      ],
      "action": {
        "title": "Recover stalled step",
        "endpoint": "/api/runs/{id}/recover",
        "input": []
      }
    }
  ]
};
