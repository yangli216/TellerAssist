import { BusinessScene, SceneType } from '../types/business';

export const sampleScenes: Record<SceneType, BusinessScene> = {
  ACCOUNT_CANCEL: {
    id: 'ACCOUNT_CANCEL',
    title: '对公账户销户申请',
    description: '核心高频场景：包含企业营业执照、销户申请书信息校验与填单',
    documentType: '营业执照 & 销户申请书',
    sampleImage: '/test_sample_license.png',
    fields: {}
  },
  BUSINESS_LICENSE_UPDATE: {
    id: 'BUSINESS_LICENSE_UPDATE',
    title: '单位营业执照更新备案',
    description: '营业执照法定代表人、注册资本变更备案业务处理',
    documentType: '更新后营业执照 / 备案登记表',
    sampleImage: '/test_license_update.png',
    fields: {}
  },
  MANAGER_CHANGE: {
    id: 'MANAGER_CHANGE',
    title: '网银管理员变更与授权',
    description: '企业网上银行主管、复核员变更及 UKEY 绑定授权',
    documentType: '网银变更申请表 & 授权书',
    sampleImage: '/test_netbank_change.png',
    fields: {}
  }
};
