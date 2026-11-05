import { apiClient } from './client';

export interface Condition {
  id: string;
  name: string;
  slug: string;
  primaryBedType: string;
  urgencyLevel: number;
  aliases: string[];
  description: string;
  requiredEquipment: string[];
}

export const conditionsApi = {
  async getConditions(q?: string): Promise<Condition[]> {
    const res = await apiClient.get('/conditions', { params: { q } });
    const raw = Array.isArray(res.data.data) ? res.data.data : res.data.data?.items || [];
    return raw.map((c: any) => {
      const bedReq = c.requirements?.find((r: any) => r.kind === 'BED');
      const equipReqs = c.requirements?.filter((r: any) => r.kind === 'EQUIPMENT').map((r: any) => r.value) || [];
      const urgency = c.urgencyLevel || (c.severity_default === 'CRITICAL' ? 5 : c.severity_default === 'URGENT' ? 3 : 2);

      return {
        id: c.id,
        name: c.name,
        slug: c.slug || c.code?.toLowerCase() || c.id,
        primaryBedType: c.primaryBedType || bedReq?.value || 'ICU',
        urgencyLevel: urgency,
        aliases: Array.isArray(c.aliases) ? c.aliases : [],
        description: c.description || `${c.category || 'Medical'} protocol - ICD-10 ${c.icd10 || 'Verified'}`,
        requiredEquipment: c.requiredEquipment || equipReqs,
      };
    });
  },
};
