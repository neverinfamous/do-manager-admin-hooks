function mapCategory(cat: string): string {
  const map: Record<string, string> = {
    feat: 'Features',
    fix: 'Bug Fixes',
    perf: 'Performance',
    security: 'Security',
    refactor: 'Code Quality',
    docs: 'Documentation',
    build: 'Build & CI',
    ci: 'Build & CI',
    chore: 'Maintenance',
    revert: 'Reverts'
  };
  return map[cat.toLowerCase()] || (cat.charAt(0).toUpperCase() + cat.slice(1));
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export default function formatChangelog(
  versionMap: Map<string, Map<string, Record<string, unknown>[]>>,
  repoHost: string,
  repoPath: string,
  _args: unknown
): string {
  console.log('Running formatChangelog with', versionMap.size, 'versions');
  let md = `# Changelog\n\n`;
  md += `All notable changes to this project are documented in this file.\n`;
  md += `This changelog is auto-generated from Git history using [lib-git-history](https://github.com/neverinfamous/adamic).\n\n`;

  for (const [version, categoryMap] of versionMap.entries()) {
    let versionDate = '';
    if (version !== 'Unreleased') {
       for (const commits of categoryMap.values()) {
         if (commits.length > 0 && commits[0].authorDate) {
            versionDate = formatDate(commits[0].authorDate as string);
            break;
         }
       }
    }
    
    const versionHeader = version === 'Unreleased' ? 'Unreleased' : `${version}${versionDate ? ` - ${versionDate}` : ''}`;
    md += `## [${versionHeader}]\n\n`;

    const sortedCategories = Array.from(categoryMap.keys())
      .filter(cat => !['chore', 'ci', 'build', 'docs', 'test', 'style'].includes(cat.toLowerCase()))
      .sort((a, b) => {
        const order = ['feat', 'fix', 'perf', 'security', 'refactor', 'revert'];
        const idxA = order.indexOf(a.toLowerCase());
        const idxB = order.indexOf(b.toLowerCase());
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

    for (const cat of sortedCategories) {
      let commits = categoryMap.get(cat)!;
      
      // Filter out low-impact commits to keep the changelog concise
      commits = commits.filter(commit => {
        if (typeof commit.metadata === 'object' && commit.metadata !== null && 'impact' in commit.metadata) {
          const impact = parseFloat(commit.metadata.impact as string);
          if (!isNaN(impact) && impact < 0.4) return false;
        }
        return true;
      });

      if (commits.length === 0) continue;

      md += `### ${mapCategory(cat)}\n\n`;
      for (const commit of commits) {
        const isBreaking = commit.isBreaking ? '**[BREAKING]** ' : '';
        const shortSha = String(commit.commit).substring(0, 7);
        const link = `([${shortSha}](https://${repoHost}/${repoPath}/commit/${commit.commit}))`;
        
        let authorStr = commit.author ? ` by **${commit.author}**` : '';
        if (Array.isArray(commit.coAuthors) && commit.coAuthors.length > 0) {
          const co = commit.coAuthors.map((c: unknown) => String(c).split('<')[0].trim()).join(', ');
          authorStr += ` (with ${co})`;
        }

        const entries = (typeof commit.metadata === 'object' && commit.metadata !== null && Array.isArray((commit.metadata as Record<string, unknown>).entry) && ((commit.metadata as Record<string, unknown>).entry as unknown[]).length > 0) 
          ? (commit.metadata as Record<string, unknown>).entry as unknown[]
          : [commit.cleanSubject || commit.subject];
          
        for (const entry of entries) {
          md += `- ${isBreaking}${entry}${authorStr} ${link}\n`;
        }
      }
      md += '\n';
    }
  }

  return md.trim() + '\n';
}
