export default {
  "title": "PROCESS FIELD",
  "headline": "The work behind the work.",
  "tag": "Execution relationships, approval paths, and workflow lineage.",
  "layout": "lanes",
  "layers": [
    [
      "workflows",
      "workflows",
      "Runbooks"
    ],
    [
      "runs",
      "runs",
      "Executions"
    ],
    [
      "approvals",
      "approvals",
      "Approvals"
    ],
    [
      "events",
      "operational-events",
      "Audit trail"
    ]
  ],
  "links": [
    [
      "runs",
      "workflows",
      [
        "workflow_id",
        "workflow"
      ],
      [
        "id",
        "name"
      ]
    ],
    [
      "approvals",
      "runs",
      [
        "run_id"
      ],
      [
        "id"
      ]
    ],
    [
      "events",
      "runs",
      [
        "run_id"
      ],
      [
        "id"
      ]
    ],
    [
      "events",
      "workflows",
      [
        "workflow_id",
        "workflow"
      ],
      [
        "id",
        "name"
      ]
    ]
  ]
};
