export interface DomainResult {
  domain: string;
  extension: string;
  isAvailable: boolean;
  price: number;
}

export const DEFAULT_EXTENSIONS = [
  { ext: '.com', basePrice: 12.99 },
  { ext: '.io', basePrice: 39.99 },
  { ext: '.ai', basePrice: 79.99 },
  { ext: '.co', basePrice: 24.99 },
  { ext: '.net', basePrice: 14.99 },
  { ext: '.org', basePrice: 11.99 },
  { ext: '.app', basePrice: 19.99 },
  { ext: '.dev', basePrice: 15.99 },
];

/**
 * Helper to determine availability from various possible DomScan response formats
 */
function isDomainAvailable(tldData: any): boolean {
  if (typeof tldData === 'boolean') return tldData;
  if (tldData && typeof tldData === 'object') {
    if (typeof tldData.available === 'boolean') return tldData.available;
    if (typeof tldData.status === 'string') return tldData.status.toLowerCase() === 'available';
    if (typeof tldData.isAvailable === 'boolean') return tldData.isAvailable;
  }
  // Default to false if we can't determine
  return false;
}

/**
 * Checks domain availability using the Next.js proxy to DomScan
 */
export async function checkDomains(keyword: string, extensions: string[]): Promise<DomainResult[]> {
  const cleanKeyword = keyword.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!cleanKeyword || extensions.length === 0) return [];

  const tldsToFetch = extensions.map(e => e.replace('.', '')).join(',');

  try {
    const response = await fetch(`/api/check-domain?name=${encodeURIComponent(cleanKeyword)}&tlds=${tldsToFetch}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || 'Failed to fetch from proxy');
    }

    const data = await response.json();
    
    const results: DomainResult[] = extensions.map((ext) => {
      const tld = ext.replace('.', '');
      
      let isAvailable = false;
      
      if (data.status && data.status[tld] !== undefined) {
        isAvailable = isDomainAvailable(data.status[tld]);
      } else if (data[tld] !== undefined) {
        isAvailable = isDomainAvailable(data[tld]);
      } else if (Array.isArray(data.results)) {
        const match = data.results.find((r: any) => r.tld === tld || r.extension === ext);
        if (match) isAvailable = isDomainAvailable(match);
      } else if (Array.isArray(data)) {
        const match = data.find((r: any) => r.tld === tld || r.extension === ext);
        if (match) isAvailable = isDomainAvailable(match);
      }

      const defaultExt = DEFAULT_EXTENSIONS.find(e => e.ext === ext);
      const basePrice = defaultExt ? defaultExt.basePrice : 15.00;

      return {
        domain: `${cleanKeyword}${ext}`,
        extension: ext,
        isAvailable,
        price: isAvailable ? basePrice : 0, 
      };
    });

    return results;

  } catch (error) {
    console.error(`Error checking domains for ${cleanKeyword}:`, error);
    throw error;
  }
}
