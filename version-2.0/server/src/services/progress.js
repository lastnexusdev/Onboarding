export function getChecklistItems({ conversionNeeded, bankEnrollment, newSoftwareRelease }) {
  const base = [
    'ConfirmContactInfo', 'ReviewRequirements', 'ScheduleAppointment',
    'DownloadSoftware', 'InformClient', 'StartInstallation',
    'EnterUserID', 'ConfigureSettings', 'ManageUserAccounts', 'RunSoftware',
    'ProvideWalkthrough', 'DemonstrateTasks', 'ContactSupport', 'OfferResources',
    'ProvideTrainingInfo', 'ScheduleFollowUp'
  ];

  if (conversionNeeded === 'Yes') {
    base.push('VerifyPlanData', 'ExecuteConversion', 'VerifyIntegrity', 'TransferSetupData');
  }
  if (bankEnrollment === 'Yes') {
    base.push('CompleteBankEnrollment');
  }
  if (Number(newSoftwareRelease) === 1) {
    base.push('InstalledNewVersion');
  }
  return base;
}

export function calculateProgress(client, settings) {
  const items = getChecklistItems({
    conversionNeeded: client.ConvertionNeeded,
    bankEnrollment: client.BankEnrollment,
    newSoftwareRelease: settings.NewSoftwareRelease || 0,
  });

  const completed = items.reduce((sum, k) => sum + (client[k] ? 1 : 0), 0);
  return Number(((completed / items.length) * 100).toFixed(2));
}
