import { useOutletContext } from 'react-router-dom'

export function useCurrentProject() {
  const context = useOutletContext()
  return {
    project: context?.project ?? null,
    projectId: context?.projectId ?? null,
    projectType: context?.projectType ?? null,
    projectModules: context?.projectModules ?? [],
  }
}
