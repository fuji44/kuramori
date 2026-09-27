import type React from 'react';
import { useState } from 'react';
import { Scale, ExternalLink, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../../i18n/context.tsx';

interface DependencyLicense {
  name: string;
  version: string;
  license: string;
  author: string;
  url: string;
  description: string;
  licenseText: string;
}

const MIT_TEXT = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const ISC_TEXT = `Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`;

const APACHE_TEXT = `Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`;

const MPL_TEXT = `This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.`;

const DEPENDENCIES: DependencyLicense[] = [
  {
    name: 'react & react-dom',
    version: '18.3.1',
    license: 'MIT',
    author: 'Meta Platforms, Inc.',
    url: 'https://github.com/facebook/react',
    description: 'The library for web and native user interfaces',
    licenseText: MIT_TEXT,
  },
  {
    name: '@xyflow/react',
    version: '12.4.4',
    license: 'MIT',
    author: 'webkid GmbH / Christopher Holtz',
    url: 'https://github.com/xyflow/xyflow',
    description: 'Interactive node-based UIs and diagram canvas',
    licenseText: MIT_TEXT,
  },
  {
    name: 'lucide-react',
    version: '0.475.0',
    license: 'ISC',
    author: 'Lucide Contributors',
    url: 'https://github.com/lucide-icons/lucide',
    description: 'Beautiful & consistent icon toolkit for React',
    licenseText: ISC_TEXT,
  },
  {
    name: 'hono',
    version: '4.6.14',
    license: 'MIT',
    author: 'Yusuke Wada',
    url: 'https://github.com/honojs/hono',
    description: 'Fast, lightweight, web-standards compliant server framework',
    licenseText: MIT_TEXT,
  },
  {
    name: '@scalar/hono-api-reference',
    version: '0.12.6',
    license: 'MIT',
    author: 'Scalar',
    url: 'https://github.com/scalar/scalar',
    description: 'Interactive modern OpenAPI and Scalar reference documentation UI',
    licenseText: MIT_TEXT,
  },
  {
    name: 'drizzle-orm',
    version: '0.38.3',
    license: 'Apache-2.0',
    author: 'Drizzle Team',
    url: 'https://github.com/drizzle-team/drizzle-orm',
    description: 'TypeScript ORM with type-safe schema definitions for SQLite',
    licenseText: APACHE_TEXT,
  },
  {
    name: '@libsql/client',
    version: '0.18.0',
    license: 'MIT',
    author: 'Turso / ChiselStrike, Inc.',
    url: 'https://github.com/tursodatabase/libsql-client-ts',
    description: 'Official client library for libSQL and SQLite',
    licenseText: MIT_TEXT,
  },
  {
    name: 'zod',
    version: '4.6.5',
    license: 'MIT',
    author: 'Colin McDonnell',
    url: 'https://github.com/colinhacks/zod',
    description: 'TypeScript-first schema validation and static inference library',
    licenseText: MIT_TEXT,
  },
  {
    name: '@d2lang/d2',
    version: '0.1.34',
    license: 'MPL-2.0',
    author: 'Terrastruct, Inc.',
    url: 'https://github.com/terrastruct/d2',
    description: 'Modern diagram scripting language and vector compiler',
    licenseText: MPL_TEXT,
  },
  {
    name: 'clsx & tailwind-merge',
    version: '2.1.1 / 2.6.0',
    license: 'MIT',
    author: 'Luke Edwards / Dany Castillo',
    url: 'https://github.com/dcastil/tailwind-merge',
    description: 'Utilities for composing and deduplicating Tailwind CSS classes',
    licenseText: MIT_TEXT,
  },
];

export function LicenseSettingsView() {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpanded = (name: string) => {
    setExpanded((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header card */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-sky-950/60 border border-sky-800/60 text-sky-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {t('settings.licenses.title')}
            </h2>
            <p className="text-xs text-[#8b949e]">
              {t('settings.licenses.description')}
            </p>
          </div>
        </div>

        {/* Project License Notice */}
        <div className="mt-4 pt-4 border-t border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d1117]/60 p-4 rounded-lg border border-[#30363d]/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">kuramori</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                MIT License
              </span>
            </div>
            <p className="text-xs text-[#8b949e] mt-1">
              Copyright (c) 2026 fuji44. All source code is released under the permissive MIT License.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>100% Compatible</span>
          </div>
        </div>
      </div>

      {/* Third Party List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white px-1">
          {t('settings.licenses.thirdPartyHeader')}
        </h3>

        {DEPENDENCIES.map((dep) => {
          const isExpanded = !!expanded[dep.name];
          return (
            <div
              key={dep.name}
              className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden transition-colors"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleExpanded(dep.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpanded(dep.name);
                  }
                }}
                className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-[#21262d]/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-[#8b949e]">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white truncate font-mono">
                        {dep.name}
                      </span>
                      <span className="text-xs text-[#8b949e] font-mono">
                        v{dep.version}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-800/60">
                        {dep.license}
                      </span>
                    </div>
                    <p className="text-xs text-[#8b949e] mt-0.5 truncate">
                      {dep.description} • {dep.author}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={dep.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 text-[#8b949e] hover:text-white rounded-md hover:bg-[#30363d]/60 transition-colors"
                    title={dep.url}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-4 pt-1 border-t border-[#30363d]/60 bg-[#0d1117]/80">
                  <div className="mt-2">
                    <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
                      License Notice ({dep.license})
                    </span>
                    <pre className="mt-2 p-3 rounded-lg bg-[#161b22] border border-[#30363d] text-xs font-mono text-[#c9d1d9] whitespace-pre-wrap leading-relaxed overflow-x-auto">
                      {dep.licenseText}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
