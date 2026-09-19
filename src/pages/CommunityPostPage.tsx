import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Group, LoadingBar, Stack, Text, Textarea } from '@/components/ui';
import { CommunityShell } from '@/features/community/CommunityShell';
import { usePost, useDeletePost, useCreateComment } from '@/features/community/queries';
import { toast } from '@/lib/toast';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CommunityPostPage() {
  const { id } = useParams();
  const postId = Number(id);
  const navigate = useNavigate();
  const { data: post, isLoading } = usePost(postId);
  const deletePost = useDeletePost();
  const createComment = useCreateComment(postId);
  const [comment, setComment] = useState('');

  const handleDelete = () => {
    if (!confirm('이 글을 삭제할까요?')) return;
    deletePost.mutate(postId, {
      onSuccess: () => {
        toast.success('삭제했어요.');
        navigate('/community');
      },
      onError: () => toast.error('삭제하지 못했어요.'),
    });
  };

  const handleComment = () => {
    if (!comment.trim()) return;
    createComment.mutate(comment, {
      onSuccess: () => setComment(''),
      onError: () => toast.error('댓글을 남기지 못했어요.'),
    });
  };

  return (
    <CommunityShell title={post?.title ?? '이야기'}>
      {isLoading && (
        <Group justify="center" py={60}>
          <LoadingBar />
        </Group>
      )}

      {post && (
        <>
          <Box
              style={{
                background: 'var(--rb-surface)',
                borderRadius: 14,
                padding: '22px 24px',
                border: '1px solid var(--rb-line)',
              }}
            >
              <Group justify="space-between" mb={12}>
                <Group gap={8}>
                  <Text fz={13} fw={600}>
                    {post.author}
                  </Text>
                  <Text fz={12} c="var(--rb-ink-faint)">
                    {formatDate(post.created_at)}
                  </Text>
                </Group>
                {post.is_own && (
                  <Button
                    variant="subtle"
                    color="red"
                    size="compact-xs"
                    onClick={handleDelete}
                    loading={deletePost.isPending}
                  >
                    삭제
                  </Button>
                )}
              </Group>
              <Text fz={15} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {post.content}
              </Text>
            </Box>

            <Stack gap={10} mt={24}>
              <Text fz={13} fw={600} c="var(--rb-ink-soft)">
                댓글 {post.comments.length}
              </Text>
              {post.comments.map((c) => (
                <Box
                  key={c.id}
                  style={{
                    background: 'var(--rb-surface)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    border: '1px solid var(--rb-line)',
                  }}
                >
                  <Group gap={8} mb={4}>
                    <Text fz={12} fw={600}>
                      {c.author}
                    </Text>
                    <Text fz={11} c="var(--rb-ink-faint)">
                      {formatDate(c.created_at)}
                    </Text>
                  </Group>
                  <Text fz={13} style={{ lineHeight: 1.6 }}>
                    {c.content}
                  </Text>
                </Box>
              ))}

              <Group align="flex-end" gap={8} mt={8}>
                <Textarea
                  placeholder="댓글을 남겨보세요"
                  value={comment}
                  onChange={(e) => setComment(e.currentTarget.value)}
                  autosize
                  minRows={1}
                  style={{ flex: 1 }}
                />
                <Button
                  color="brand"
                  radius="md"
                  onClick={handleComment}
                  loading={createComment.isPending}
                >
                  등록
                </Button>
              </Group>
            </Stack>
          </>
        )}
    </CommunityShell>
  );
}
