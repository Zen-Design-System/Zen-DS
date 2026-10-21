# Session log 2026-10-21

## Session "Bug" · PageHeader description tone (tier XS; user: "trong Figma dòng subtext dưới header là tone Light chứ không phải base")

- Read live (use_figma): Primitives/Dashboard/Header Type=Main 4122:33399 SubHeading = Body/Base/Regular,
  Color/Content/Neutral/Light; Type=Control-Bar Subheading (the result count) = Strongest (code already matches).
- PageHeader `description` Text tone base → light (DashboardHeader type="main" renders PageHeader, so its subheading
  follows). JSDoc cites the node; guidelines + api docs rebuilt.
