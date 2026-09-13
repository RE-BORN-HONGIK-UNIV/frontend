import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export function usePosts() {
  return useQuery({
    queryKey: ['community', 'posts'],
    queryFn: () => api.listPosts(),
  });
}

export function usePost(id: number) {
  return useQuery({
    queryKey: ['community', 'posts', id],
    queryFn: () => api.getPost(id),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ title, content }: { title: string; content: string }) =>
      api.createPost(title, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community', 'posts'] }),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deletePost(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community', 'posts'] }),
  });
}

export function useCreateComment(postId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => api.createComment(postId, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community', 'posts', postId] }),
  });
}
