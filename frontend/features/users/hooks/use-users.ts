'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AcceptInviteRequest, InviteUserRequest, UserListRequest } from '@oficina/contracts';
import { usersApi } from '../api/users-api';

const USERS_LIST_KEY = 'users-list';

export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: InviteUserRequest) => usersApi.invite(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_LIST_KEY] });
    },
  });
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: (request: AcceptInviteRequest) => usersApi.acceptInvite(request),
  });
}

export function useUsersList(request: UserListRequest) {
  return useQuery({
    queryKey: [USERS_LIST_KEY, request],
    queryFn: () => usersApi.list(request),
    placeholderData: (previousData) => previousData,
  });
}
