import type * as Monaco from 'monaco-editor';

const keywords = [
  'fonksiyon', 'değişken', 'degisken', 'eğer', 'eger', 'değilse', 'degilse', 'döndür', 'dondur',
  'sınıf', 'sinif', 'soyut', 'arayuz', 'enum', 'override', 'ez', 'genel', 'özel', 'ozel',
  'korumalı', 'korumali', 'uygular', 'aktar', 'olarak', 'dışa', 'disa', 'kullanılıyor', 'kullaniliyor',
  'doğru', 'dogru', 'yanlış', 'yanlis', 've', 'veya', 'değil', 'degil', 'iken', 'için', 'icin', 'kır', 'kir', 'devam'
];

export function registerNyLanguage(monaco: typeof Monaco) {
  const langId = 'ny';

  if (monaco.languages.getLanguages().some((lang) => lang.id === langId)) {
    return;
  }

  monaco.languages.register({ id: langId, extensions: ['.ny', '.dil'] });
  monaco.languages.setLanguageConfiguration(langId, {
    comments: {
      lineComment: '--'
    },
    brackets: [['{', '}'], ['[', ']'], ['(', ')']],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' }
    ]
  });

  monaco.languages.setMonarchTokensProvider(langId, {
    keywords,
    tokenizer: {
      root: [
        [/--.*$/, 'comment'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
        [/[{}()\[\]]/, '@brackets'],
        [/[,:;]/, 'delimiter'],
        [/\b\d+(?:\.\d+)?\b/, 'number'],
        [/\b(true|false|doğru|dogru|yanlış|yanlis)\b/, 'constant.language'],
        [/[a-zA-Z_çğıöşüÇĞİÖŞÜ][\wçğıöşüÇĞİÖŞÜ]*/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier'
          }
        }]
      ],
      string: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
      ]
    }
  });
}
