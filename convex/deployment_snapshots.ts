export function shouldRecordDeploymentSnapshot(
  previousTotalDeploys: number | null | undefined,
  nextTotalDeploys: number,
) {
  return (
    previousTotalDeploys == null || previousTotalDeploys !== nextTotalDeploys
  );
}
