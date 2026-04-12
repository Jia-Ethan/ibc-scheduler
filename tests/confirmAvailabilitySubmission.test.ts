import { describe, expect, it } from 'vitest';
import { getConfirmAvailabilitySubmissionErrorMessage } from '../src/lib/storage';

describe('confirm availability submission error messages', () => {
  it('explains missing email or admin configuration', () => {
    expect(getConfirmAvailabilitySubmissionErrorMessage('Missing required function secrets.')).toContain(
      '缺少管理员邮箱或邮件服务配置',
    );
  });

  it('explains email failure with successful rollback', () => {
    expect(
      getConfirmAvailabilitySubmissionErrorMessage('Email failed. Availability has been rolled back.'),
    ).toContain('给班结果未保存');
  });

  it('explains email failure when rollback also fails', () => {
    expect(
      getConfirmAvailabilitySubmissionErrorMessage('Email failed and availability rollback failed.'),
    ).toContain('保存状态');
  });

  it('keeps no-change submissions clear to users', () => {
    expect(getConfirmAvailabilitySubmissionErrorMessage('No availability changes to submit.')).toBe(
      '本次没有给班变更，无需提交。',
    );
  });
});
