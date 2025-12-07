/**
 * 配置验证工具
 * 用于验证 MediaSource 配置是否正确
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateMediaSource(source: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查基本结构
  if (!source.arguments) {
    errors.push('缺少 arguments 字段');
    return { valid: false, errors, warnings };
  }

  const args = source.arguments;
  const config = args.searchConfig;

  if (!config) {
    errors.push('缺少 arguments.searchConfig 字段');
    return { valid: false, errors, warnings };
  }

  // 检查必要的搜索配置
  if (!config.searchUrl) {
    errors.push('缺少 searchConfig.searchUrl');
  }

  if (!config.subjectFormatId) {
    errors.push('缺少 searchConfig.subjectFormatId');
  }

  if (!config.channelFormatId) {
    errors.push('缺少 searchConfig.channelFormatId');
  }

  // 检查 subjectFormatId 对应的选择器
  if (config.subjectFormatId === 'a' && !config.selectorSubjectFormatA?.selectLists) {
    errors.push('subjectFormatId 为 "a" 时，需要 selectorSubjectFormatA.selectLists');
  }

  if (config.subjectFormatId === 'indexed') {
    if (!config.selectorSubjectFormatIndexed?.selectNames) {
      errors.push('subjectFormatId 为 "indexed" 时，需要 selectorSubjectFormatIndexed.selectNames');
    }
    if (!config.selectorSubjectFormatIndexed?.selectLinks) {
      errors.push('subjectFormatId 为 "indexed" 时，需要 selectorSubjectFormatIndexed.selectLinks');
    }
  }

  // 检查 channelFormatId 对应的选择器
  if (config.channelFormatId === 'flattened' && !config.selectorChannelFormatFlattened) {
    warnings.push('channelFormatId 为 "flattened" 时，建议设置 selectorChannelFormatFlattened');
  }

  if (config.channelFormatId === 'index-grouped' && !config.selectorChannelFormatFlattened) {
    warnings.push('channelFormatId 为 "index-grouped" 时，建议设置 selectorChannelFormatFlattened');
  }

  if (!config.selectorChannelFormatNoChannel && !config.selectorChannelFormatFlattened) {
    warnings.push('建议至少设置 selectorChannelFormatFlattened 或 selectorChannelFormatNoChannel');
  }

  // 检查视频提取配置
  if (!config.matchVideo) {
    warnings.push('未配置 matchVideo，可能无法提取视频 URL');
  } else {
    if (!config.matchVideo.matchVideoUrl) {
      errors.push('matchVideo 必须包含 matchVideoUrl 正则表达式');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 验证 CSS 选择器是否有效
 */
export function validateSelector(selector: string): boolean {
  if (!selector || typeof selector !== 'string') {
    return false;
  }

  try {
    // 尝试在 JSDOM 中编译选择器
    document.querySelectorAll(selector);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 验证正则表达式是否有效
 */
export function validateRegex(pattern: string): boolean {
  if (!pattern || typeof pattern !== 'string') {
    return false;
  }

  try {
    new RegExp(pattern);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 验证 URL 是否有效
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 完整的配置检查报告
 */
export function generateValidationReport(source: any): string {
  const validation = validateMediaSource(source);

  let report = `\n📋 配置验证报告\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `源名称: ${source.arguments?.name || '未知'}\n\n`;

  if (validation.valid) {
    report += `✅ 配置有效\n\n`;
  } else {
    report += `❌ 配置无效\n\n`;
    report += `错误 (${validation.errors.length}):\n`;
    validation.errors.forEach((err, i) => {
      report += `  ${i + 1}. ${err}\n`;
    });
    report += `\n`;
  }

  if (validation.warnings.length > 0) {
    report += `⚠️  警告 (${validation.warnings.length}):\n`;
    validation.warnings.forEach((warn, i) => {
      report += `  ${i + 1}. ${warn}\n`;
    });
    report += `\n`;
  }

  const config = source.arguments?.searchConfig;
  if (config) {
    report += `配置详情:\n`;
    report += `  搜索 URL: ${config.searchUrl}\n`;
    report += `  Subject 格式: ${config.subjectFormatId}\n`;
    report += `  Channel 格式: ${config.channelFormatId}\n`;
    report += `  视频提取: ${config.matchVideo ? '已配置' : '未配置'}\n`;
  }

  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  return report;
}
