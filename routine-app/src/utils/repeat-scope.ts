import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { t } from '@/i18n';
import type { Plan } from '@/store/types';

/**
 * Repeating plans are stored as one plan per occurrence sharing a `repeatId`. Deleting or editing
 * one asks, like iOS Calendar, whether it applies to this occurrence only or to it and every later
 * one in the series (user, 2026-10-28).
 */

const startKey = (p: Plan) => `${p.date}T${p.time}`;

/** `plan` and the later occurrences of its series, earliest first. Just `plan` when it doesn't repeat. */
export function seriesFrom(plans: Plan[], plan: Plan): Plan[] {
  if (!plan.repeatId) return [plan];
  const from = startKey(plan);
  return plans.filter((p) => p.repeatId === plan.repeatId && startKey(p) >= from).sort((a, b) => startKey(a).localeCompare(startKey(b)));
}

/** The last date of `plan`'s series. */
export function seriesEndDate(plans: Plan[], plan: Plan): string {
  if (!plan.repeatId) return plan.date;
  return plans.filter((p) => p.repeatId === plan.repeatId).reduce((last, p) => (p.date > last ? p.date : last), plan.date);
}

/** Native choice sheet: the picked plan(s) only, or those and all later occurrences. Cancel does nothing. */
function showScopeSheet(title: string, thisLabel: string, futureLabel: string, destructive: boolean, onThis: () => void, onFuture: () => void) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [thisLabel, futureLabel, t('common.cancel')],
        cancelButtonIndex: 2,
        destructiveButtonIndex: destructive ? [0, 1] : undefined,
      },
      (i) => (i === 0 ? onThis() : i === 1 ? onFuture() : undefined)
    );
    return;
  }
  Alert.alert(title, undefined, [
    { text: t('common.cancel'), style: 'cancel' },
    { text: thisLabel, style: destructive ? 'destructive' : 'default', onPress: onThis },
    { text: futureLabel, style: destructive ? 'destructive' : 'default', onPress: onFuture },
  ]);
}

function askScope(kind: 'delete' | 'save', onThis: () => void, onFuture: () => void) {
  const thisLabel = t(kind === 'delete' ? 'plan.deleteThisOnly' : 'plan.saveThisOnly');
  const futureLabel = t(kind === 'delete' ? 'plan.deleteFuture' : 'plan.saveFuture');
  showScopeSheet(t('plan.repeatingTitle'), thisLabel, futureLabel, kind === 'delete', onThis, onFuture);
}

/**
 * Confirms deleting `plan`: the this-or-future sheet when later occurrences exist, otherwise the
 * usual "Delete Plan?" alert. `onThis` / `onFuture` run only on a confirmed choice.
 */
export function confirmPlanDelete(plans: Plan[], plan: Plan, onThis: () => void, onFuture: () => void) {
  if (seriesFrom(plans, plan).length > 1) return askScope('delete', onThis, onFuture);
  Alert.alert(t('plan.deleteTitle'), t('plan.deleteBody', { name: plan.name }), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('common.delete'), style: 'destructive', onPress: onThis },
  ]);
}

/** Asks this-or-future when saving an edit to a plan with later occurrences; otherwise saves just this one. */
export function confirmPlanSave(plans: Plan[], plan: Plan, onThis: () => void, onFuture: () => void) {
  if (seriesFrom(plans, plan).length > 1) return askScope('save', onThis, onFuture);
  onThis();
}

/**
 * Confirms deleting the Edit-mode selection: when any selected plan has later occurrences, offers
 * the selection only or with those future plans too; otherwise the usual "Delete Plans?" alert.
 */
export function confirmSelectedDelete(plans: Plan[], selectedIds: string[], onSelected: () => void, onWithFuture: () => void) {
  const ids = new Set(selectedIds);
  const hasFuture = plans.some((p) => ids.has(p.id) && seriesFrom(plans, p).some((s) => !ids.has(s.id)));
  if (hasFuture) {
    return showScopeSheet(t('plans.repeatingTitle'), t('plans.deleteSelectedOnly'), t('plans.deleteWithFuture'), true, onSelected, onWithFuture);
  }
  Alert.alert(t('plans.deleteTitle'), t('plans.deleteBody', { count: selectedIds.length }), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('common.delete'), style: 'destructive', onPress: onSelected },
  ]);
}
