// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  // 忽略的文件和目录
  {
    ignores: ["dist/", "node_modules/", "coverage/", "plans/"],
  },

  // 基础 ESLint 推荐规则
  eslint.configs.recommended,

  // TypeScript 推荐规则
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // TypeScript 解析器配置
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // 自定义规则
  {
    rules: {
      // TypeScript 相关
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/require-await": "off", // CLI 工具中有些函数需要保持 async 签名
      "@typescript-eslint/prefer-nullish-coalescing": "off", // 允许使用 || 运算符
      "@typescript-eslint/no-unsafe-assignment": "warn", // 降级为警告
      "@typescript-eslint/no-unsafe-member-access": "warn", // 降级为警告
      "@typescript-eslint/no-unsafe-argument": "warn", // 降级为警告

      // 代码质量
      "no-console": "off", // CLI 工具需要使用 console
      "no-control-regex": "off", // 允许正则表达式中的控制字符（用于文件名验证）
      "no-useless-escape": "warn", // 降级为警告
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
    },
  },

  // Prettier 兼容配置（必须放在最后）
  eslintConfigPrettier
);