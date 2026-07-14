import type { BackendExportPlan, BackendOutline } from '../engine/types';
import type { Scenario, Volume } from '../engine/demo/types';

export interface DisplayVolume extends Volume {
  fileName: string;
}

export function getDisplayVolumes(
  scenario: Scenario,
  backendExportPlan?: BackendExportPlan | null,
  backendOutline?: BackendOutline | null,
): DisplayVolume[] {
  if (!backendExportPlan) {
    return scenario.volumes.map((volume, index) => ({
      ...volume,
      fileName: `${index + 1}-${scenario.meta.项目名}-${volume.名称}.docx`,
    }));
  }

  const sectionsById = new Map(
    (backendOutline?.sections ?? []).map((section, index) => [
      section.id || `live-chapter-${index + 1}`,
      section,
    ]),
  );

  return backendExportPlan.volumes.map((volume) => ({
    id: volume.volume_id,
    名称: volume.cover_title,
    单独密封: volume.sealed_separately,
    fileName: volume.file_name,
    chapters: volume.section_ids.map((sectionId) => {
      const section = sectionsById.get(sectionId);
      return {
        id: sectionId,
        标题: section?.title || sectionId,
        类型: '自撰区' as const,
        maps_to_requirement_ids: section?.maps_to_requirement_ids ?? [],
      };
    }),
  }));
}

export function exportArtifactLabel(
  backendExportPlan?: BackendExportPlan | null,
  serverDocxUrl?: string | null,
): string {
  if (backendExportPlan?.package_zip || serverDocxUrl?.endsWith('.zip')) {
    return '下载分册打包 ZIP';
  }
  if (backendExportPlan || serverDocxUrl) {
    return '下载服务端 Word (.docx)';
  }
  return '下载草稿 Word (.docx)';
}
