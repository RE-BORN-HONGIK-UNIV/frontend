import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { PageHeader } from '@/components/PageHeader';
import { usePosts, useCreatePost } from '@/features/community/queries';
import { toast } from '@/lib/toast';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

function WriteModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const createPost = useCreatePost();
  const form = useForm({
    initialValues: { title: '', content: '' },
    validate: {
      title: (v) => (v.trim() ? null : '제목을 입력해주세요.'),
      content: (v) => (v.trim() ? null : '내용을 입력해주세요.'),
    },
  });

  const submit = form.onSubmit((values) => {
    createPost.mutate(values, {
      onSuccess: () => {
        toast.success('글이 올라갔어요.');
        form.reset();
        onClose();
      },
      onError: () => toast.error('글을 올리지 못했어요. 다시 시도해주세요.'),
    });
  });

  return (
    <Modal opened={opened} onClose={onClose} title="이야기 남기기" radius="md" centered>
      <form onSubmit={submit} noValidate>
        <Stack gap={14}>
          <TextInput
            label="제목"
            placeholder="어떤 이야기를 나누고 싶으세요?"
            {...form.getInputProps('title')}
          />
          <Textarea
            label="내용"
            placeholder="편하게 써주세요. 판단하는 사람 없어요."
            minRows={6}
            autosize
            {...form.getInputProps('content')}
          />
          <Button type="submit" color="brand" radius="md" loading={createPost.isPending} fullWidth>
            올리기
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}

export default function CommunityPage() {
  const { data, isLoading, isError } = usePosts();
  const posts = data?.posts ?? [];
  const [writeOpen, setWriteOpen] = useState(false);

  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 60 }}>
      <PageHeader
        back="/dashboard"
        eyebrow="이야기"
        title="자유롭게 이야기 나눠요"
        subtitle="고민, 오늘 있었던 일, 하고 싶은 말 — 뭐든 편하게 남겨주세요."
      />

      <Box style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 0' }}>
        <Group justify="flex-end" mb={16}>
          <Button color="brand" radius="md" onClick={() => setWriteOpen(true)}>
            이야기 남기기
          </Button>
        </Group>

        {isLoading && (
          <Group justify="center" py={60}>
            <Loader size="sm" color="brand" />
          </Group>
        )}

        {isError && (
          <Stack align="center" py={60} gap={6}>
            <Text fz={14} c="var(--rb-ink-soft)">
              이야기를 불러오지 못했어요. 잠시 후 다시 시도해주세요.
            </Text>
          </Stack>
        )}

        {!isLoading && !isError && posts.length === 0 && (
          <Stack align="center" py={60} gap={6}>
            <Text fz={14} c="var(--rb-ink-soft)">
              아직 올라온 이야기가 없어요. 첫 이야기를 남겨보세요.
            </Text>
          </Stack>
        )}

        <Stack gap={12}>
          {posts.map((p) => (
            <Box
              key={p.id}
              component={Link}
              to={`/community/${p.id}`}
              className="rb-card-hover"
              style={{
                display: 'block',
                background: 'var(--rb-surface)',
                borderRadius: 14,
                padding: '18px 20px',
                border: '1px solid var(--rb-line)',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <Text fz={16} fw={600} mb={6}>
                {p.title}
              </Text>
              <Text fz={13} c="var(--rb-ink-soft)" lineClamp={2} mb={10}>
                {p.content}
              </Text>
              <Group gap={10} fz={12} c="var(--rb-ink-faint)">
                <Text fz={12} c="var(--rb-ink-faint)">
                  {p.author}
                </Text>
                <Text fz={12} c="var(--rb-ink-faint)">
                  ·
                </Text>
                <Text fz={12} c="var(--rb-ink-faint)">
                  {formatDate(p.created_at)}
                </Text>
                <Text fz={12} c="var(--rb-ink-faint)">
                  · 댓글 {p.comment_count}
                </Text>
              </Group>
            </Box>
          ))}
        </Stack>
      </Box>

      <WriteModal opened={writeOpen} onClose={() => setWriteOpen(false)} />
    </Box>
  );
}
