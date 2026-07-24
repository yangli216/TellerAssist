import { describe, expect, it } from 'vitest';
import { FieldItem } from '../types/business';
import { generateBankMessage } from './exportService';

const validField: FieldItem = {
  id: 'companyName',
  label: '企业名称',
  value: '北京测试科技有限公司',
  ocrValue: '北京测试科技有限公司',
  source: 'OCR',
  confidence: 0.98,
  bbox: { x: 10, y: 10, width: 20, height: 5 },
  status: 'PASSED',
  userModified: false,
};

describe('报文准入控制', () => {
  it('拒绝生成空报文', () => {
    expect(() => generateBankMessage('ACCOUNT_CANCEL', {})).toThrow('空报文');
  });

  it('拒绝存在未通过字段的报文', () => {
    expect(() => generateBankMessage('ACCOUNT_CANCEL', {
      companyName: { ...validField, status: 'REVIEW' },
    })).toThrow('未通过校验');
  });

  it('区分自动校验与人工修正', () => {
    expect(generateBankMessage('ACCOUNT_CANCEL', { companyName: validField }).header.auditStatus)
      .toBe('PASSED_AUTO_VALIDATION');
    expect(generateBankMessage('ACCOUNT_CANCEL', {
      companyName: { ...validField, source: 'MANUAL', userModified: true },
    }).header.auditStatus).toBe('PASSED_MANUAL_VALIDATED');
  });
});
