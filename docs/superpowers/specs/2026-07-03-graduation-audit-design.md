# Graduation Audit Design

## Goal

Add a conservative graduation requirement self-check to each undergraduate major page so students can see whether a displayed or DIY semester plan appears to satisfy the site's known CityUHK graduation requirements.

## Approved Scope

- Show the audit on the study plan tab and in edit mode.
- Check total credits, required course presence, section credit progress, GE requirements, duplicate courses, prerequisite order, semester overload, and offering-semester mismatches.
- Mark plans whose source is `derived` or `diy` as advisory rather than official.
- Do not block user edits. The audit only warns.
- Do not infer exact missing courses for sections that only provide generic placeholders or numeric credit requirements.

## Data Confidence Rules

- `official`: treat the semester arrangement as sourced from an official study plan.
- `structure`: treat the course set as official structure/flowchart data, but keep semester-plan wording cautious.
- `derived`: explain that the arrangement is based on graduation requirements rather than an official study plan.
- `diy`: show an empty planning grid and audit the course pool/requirements without pre-filling a semester order.

## Audit Model

The new utility should accept:

```ts
auditGraduationPlan(major, courses, plan, streamIndex?)
```

It should return:

```ts
{
  status: 'ok' | 'warning' | 'danger',
  totalCredits: { planned, required, missing },
  source: { kind, label, advisory },
  sections: [
    {
      key,
      label,
      plannedCredits,
      requiredCredits,
      missingCredits,
      requiredCourseCodes,
      missingCourseCodes,
      confidence: 'exact' | 'credit' | 'advisory'
    }
  ],
  ge: {
    plannedCredits,
    requiredCredits,
    missingCredits,
    areaCredits,
    missingAreas,
    missingRequiredCodes
  },
  warnings: [
    { severity: 'info' | 'warning' | 'danger', message, codes? }
  ]
}
```

## UI Placement

- Add a `GraduationAuditPanel` component.
- In normal plan view, render it after the source banner and before the category legend.
- In edit mode, render it above the editable semester grid, using the current saved/dragged plan.
- Use concise Chinese copy:
  - "毕业要求自检"
  - "仅按当前网站数据自动核对，请以学院/ARRO最终审核为准"
  - "不是官网明确 study plan，仅按毕业要求整理，请自行 DIY 学期安排"

## Verification

- Add failing tests before implementation.
- Test missing required courses, GE area warnings, duplicate detection, prerequisite order, advisory source labeling, and DIY empty-plan behavior.
- Run `npm test` and `npm run build` before committing.
