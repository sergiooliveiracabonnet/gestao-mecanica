'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AssignUserProfileRequest, CreateAccessProfileRequest, UpdateAccessProfileRequest } from '@oficina/contracts';
import { accessProfilesApi } from '../api/access-profiles-api';

export const ACCESS_PROFILES_KEY = ['access-profiles'] as const;
export function useAccessProfiles(enabled = true) { return useQuery({ queryKey: ACCESS_PROFILES_KEY, queryFn: accessProfilesApi.list, enabled }); }
export function useCreateAccessProfile() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: CreateAccessProfileRequest) => accessProfilesApi.create(input), onSuccess: () => client.invalidateQueries({ queryKey: ACCESS_PROFILES_KEY }) });
}
export function useUpdateAccessProfile() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: UpdateAccessProfileRequest) => accessProfilesApi.update(input), onSuccess: () => client.invalidateQueries({ queryKey: ACCESS_PROFILES_KEY }) });
}
export function useAssignUserProfile() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: AssignUserProfileRequest) => accessProfilesApi.assign(input), onSuccess: () => {
    client.invalidateQueries({ queryKey: ACCESS_PROFILES_KEY });
    client.invalidateQueries({ queryKey: ['users-list'] });
  } });
}
