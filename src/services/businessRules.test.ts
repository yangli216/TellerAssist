import { describe, expect, it } from 'vitest';
import {
  OcrLine,
  parseBusinessFields,
  validateFieldValue,
  validateUnifiedSocialCreditCode,
} from './businessRules';

const line = (text: string, confidence = 96, y = 10): OcrLine => ({
  text,
  confidence,
  bbox: { x0: 100, y0: y, x1: 900, y1: y + 40 },
});

describe('统一社会信用代码校验', () => {
  it('按 GB 32100-2015 校验最后一位', () => {
    expect(validateUnifiedSocialCreditCode('911101085923662400')).toBe(true);
    expect(validateUnifiedSocialCreditCode('91110108MA00ABC123')).toBe(false);
  });
});

describe('营业执照字段解析', () => {
  const lines = [
    line('统一社会信用代码：911101085923662400', 98, 100),
    line('名 称：北京测试科技有限公司', 97, 150),
    line('类 型：有限责任公司（自然人独资）', 97, 175),
    line('法定代表人：王晓明', 96, 200),
    line('注册资本：伍佰万元整', 95, 250),
    line('成立日期：2018年11月08日', 94, 300),
    line('住 所：北京市海淀区中关村大街8号', 93, 350),
  ];

  it('只使用 OCR 文本产生字段和坐标', () => {
    const fields = parseBusinessFields(
      'ACCOUNT_CANCEL',
      lines,
      lines.map((item) => item.text).join('\n'),
      { width: 1000, height: 1000 },
      0.85,
    );

    expect(fields.uscc.value).toBe('911101085923662400');
    expect(fields.companyName.value).toBe('北京测试科技有限公司');
    expect(fields.companyType.value).toBe('有限责任公司（自然人独资）');
    expect(fields.legalPerson.value).toBe('王晓明');
    expect(fields.establishDate.status).toBe('PASSED');
    expect(fields.address.bbox.y).toBe(35);
    expect(fields.uscc.status).toBe('PASSED');
    expect(fields.companyName.status).toBe('REVIEW');
    expect(validateFieldValue('ACCOUNT_CANCEL', 'companyName', fields.companyName.value, 1, 0.85, true).status).toBe('PASSED');
  });

  it('同一识别行包含标签和值时，坐标框只覆盖值区域', () => {
    const fields = parseBusinessFields(
      'MANAGER_CHANGE',
      [{ text: '原网银管理员：张伟', confidence: 96, bbox: { x0: 100, y0: 200, x1: 500, y1: 240 } }],
      '原网银管理员：张伟',
      { width: 1000, height: 1000 },
    );

    expect(fields.oldAdmin.value).toBe('张伟');
    expect(fields.oldAdmin.bbox.x).toBeGreaterThan(35);
    expect(fields.oldAdmin.bbox.width).toBeLessThan(15);
  });

  it('不使用默认业务值填充未识别字段', () => {
    const fields = parseBusinessFields(
      'ACCOUNT_CANCEL',
      [line('统一社会信用代码：911101085923662400')],
      '统一社会信用代码：911101085923662400',
      { width: 1000, height: 1000 },
    );

    expect(fields.companyName.value).toBe('');
    expect(fields.companyName.status).toBe('MISSING');
  });

  it('低置信度字段不自动通过', () => {
    const validation = validateFieldValue('ACCOUNT_CANCEL', 'companyName', '北京测试科技有限公司', 0.62, 0.85);
    expect(validation.status).toBe('REVIEW');
    expect(validation.ruleMessage).toContain('62%');
  });

  it('标签和值被切成两个框时按同一行坐标提取', () => {
    const splitLines: OcrLine[] = [
      { text: '名称：', confidence: 96, bbox: { x0: 30, y0: 200, x1: 110, y1: 230 } },
      { text: '法定代表人：', confidence: 95, bbox: { x0: 30, y0: 250, x1: 150, y1: 280 } },
      { text: '悦动科技有限公司', confidence: 91, bbox: { x0: 130, y0: 198, x1: 410, y1: 232 } },
    ];
    const fields = parseBusinessFields(
      'ACCOUNT_CANCEL',
      splitLines,
      splitLines.map((item) => item.text).join('\n'),
      { width: 1000, height: 1000 },
    );

    expect(fields.companyName.value).toBe('悦动科技有限公司');
    expect(fields.companyName.bbox.x).toBe(13);
  });

  it('两字标签被拆成两个框时从第二个框提取行内值', () => {
    const splitLines: OcrLine[] = [
      { text: '类', confidence: 95, bbox: { x0: 30, y0: 210, x1: 50, y1: 235 } },
      { text: '型：有限责任公司（自然人独资）', confidence: 94, bbox: { x0: 75, y0: 208, x1: 420, y1: 237 } },
    ];
    const fields = parseBusinessFields(
      'ACCOUNT_CANCEL',
      splitLines,
      splitLines.map((item) => item.text).join('\n'),
      { width: 1000, height: 1000 },
    );
    expect(fields.companyType.value).toBe('有限责任公司（自然人独资）');
  });
});

describe('网银管理员变更解析', () => {
  it('按场景输出独立字段集', () => {
    const lines = [
      line('对公账号：6222023602009999888'),
      line('单位名称：北京博达创新科技有限公司'),
      line('原管理员：张伟'),
      line('新管理员：赵敏'),
      line('联系手机：13800138000'),
    ];
    const fields = parseBusinessFields(
      'MANAGER_CHANGE',
      lines,
      lines.map((item) => item.text).join('\n'),
      { width: 1000, height: 1000 },
    );

    expect(Object.keys(fields)).toEqual(['accountNo', 'companyName', 'oldAdmin', 'newAdmin', 'phone']);
    expect(fields.phone.status).toBe('PASSED');
  });
});

describe('营业执照更新场景', () => {
  it('使用备案申请表的字段定义', () => {
    const lines = [
      line('统一社会信用代码：911101085923662400'),
      line('变更后企业名称：上海智领云计算科技股份有限公司'),
      line('新任法定代表人：李四'),
      line('原注册资本：壹仟万元整'),
      line('变更申请日期：2026年07月24日'),
      line('备案登记机关：上海市市场监督管理局浦东分局'),
    ];
    const fields = parseBusinessFields(
      'BUSINESS_LICENSE_UPDATE',
      lines,
      lines.map((item) => item.text).join('\n'),
      { width: 1000, height: 1000 },
    );

    expect(Object.keys(fields)).toEqual(['uscc', 'companyName', 'legalPerson', 'regCapital', 'changeDate', 'registryAuthority']);
    expect(fields.changeDate.status).toBe('PASSED');
    expect(fields.registryAuthority.value).toContain('浦东分局');
  });
});
