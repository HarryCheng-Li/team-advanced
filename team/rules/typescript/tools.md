# TypeScript 工具配置

## tsconfig.json 配置

### 推荐基础配置
```json
{
  "compilerOptions": {
    /* 基础选项 */
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",

    /* 严格类型检查 */
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    /* 额外检查 */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,

    /* 模块解析 */
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,

    /* 路径映射 */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@services/*": ["src/services/*"],
      "@utils/*": ["src/utils/*"]
    },

    /* 输出 */
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    /* 跳过检查 */
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 项目类型特定配置

#### Node.js 项目
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "types": ["node"]
  }
}
```

#### React 项目
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["node", "jest", "@types/react", "@types/react-dom"]
  }
}
```

#### Next.js 项目
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

#### 库开发
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

### 配置继承
```json
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022"
  }
}

// tsconfig.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  }
}
```

## ESLint 配置

### 推荐配置 (.eslintrc.json)
```json
{
  "root": true,
  "env": {
    "browser": true,
    "es2022": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint", "import"],
  "rules": {
    /* TypeScript 规则 */
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/strict-boolean-expressions": ["error", {
      "allowString": true,
      "allowNumber": true
    }],

    /* Import 规则 */
    "import/order": ["error", {
      "groups": [
        "builtin",
        "external",
        "internal",
        "parent",
        "sibling",
        "index"
      ],
      "newlines-between": "always",
      "alphabetize": { "order": "asc" }
    }],
    "import/no-unresolved": "error",
    "import/no-duplicates": "error",

    /* 通用规则 */
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": ["error", "always"],
    "curly": ["error", "all"]
  },
  "settings": {
    "import/resolver": {
      "typescript": {
        "project": "./tsconfig.json"
      }
    }
  }
}
```

### 扁平配置 (eslint.config.js) - ESLint 9+
```javascript
import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': ts,
      'import': importPlugin,
    },
    rules: {
      ...ts.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];
```

### React 项目额外规则
```json
{
  "extends": [
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### 忽略文件 (.eslintignore)
```
node_modules/
dist/
build/
*.config.js
*.config.ts
coverage/
```

## Prettier 配置

### 配置文件 (.prettierrc)
```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "quoteProps": "as-needed",
  "jsxSingleQuote": false,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "singleAttributePerLine": false,
  "htmlWhitespaceSensitivity": "css"
}
```

### 配置说明
| 选项 | 默认值 | 说明 |
|------|--------|------|
| `printWidth` | 80 | 每行最大字符数 |
| `tabWidth` | 2 | 缩进空格数 |
| `useTabs` | false | 使用制表符 |
| `semi` | true | 语句末尾分号 |
| `singleQuote` | false | 使用单引号 |
| `trailingComma` | "es5" | 尾随逗号 |
| `bracketSpacing` | true | 对象括号内空格 |
| `arrowParens` | "always" | 箭头函数参数括号 |

### 忽略文件 (.prettierignore)
```
node_modules/
dist/
build/
coverage/
*.min.js
package-lock.json
pnpm-lock.yaml
yarn.lock
```

### 编辑器集成 (VS Code)
```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## 集成脚本 (package.json)

```json
{
  "scripts": {
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,json}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css,json}\"",
    "typecheck": "tsc --noEmit",
    "check": "npm run typecheck && npm run lint && npm run format:check"
  }
}
```

## 常用 VS Code 扩展

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "usernamehw.errorlens",
    "streetsidesoftware.code-spell-checker",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

## Husky + lint-staged 配置

### 安装
```bash
npm install -D husky lint-staged
npx husky init
```

### pre-commit hook (.husky/pre-commit)
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

### lint-staged 配置 (package.json)
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,css}": [
      "prettier --write"
    ]
  }
}
```
