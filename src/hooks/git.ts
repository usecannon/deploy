import { useQuery } from '@tanstack/react-query';
import * as git from '../utils/git'
import http from 'isomorphic-git/http/web'

import diff from 'diff'

import { ServerRef, listServerRefs } from 'isomorphic-git'
import { useMemo } from 'react';

export function useGitRefsList(url: string) {
  const refsQuery = useQuery(['git', 'ls-remote', url], {
    queryFn: async () => {
      if (url) {
        return listServerRefs({
          http,
          corsProxy: "https://cors.isomorphic-git.org",
          url,
          protocolVersion: 1 // reccomended when not filtering prefix
        })
      }

      return []
    }
  })

  return {
    refsQuery,
    refs: refsQuery.data as ServerRef[]
  }
}

export function useGitFilesList(url: string, ref: string, path: string) {
  const gitRepoQuery = useGitRepo(url, ref, [])

  const readdirQuery = useQuery(['git', 'readdir', url, ref, path], {
    queryFn: async () => {
      return git.readDir(url, ref, path)
    },
    enabled: gitRepoQuery.isSuccess
  })

  return {
    gitRepoQuery,
    readdirQuery,
    contents: readdirQuery.data
  }
}

// load files from a git repo
export function useGitRepo(url: string, ref: string, files: string[]) {
  return useQuery(['git', 'clone', url, ref, files], {
    queryFn: async () => {
      await git.init(url, ref)
      const fileContents = []
      for (const file of files) {
        fileContents.push(await git.readFile(url, ref, file));
      }

      return fileContents
    },
    enabled: url != '' && ref != ''
  })
}

/**
 * Generates a unified diff of the specified files
 * @param url the git repository to generate the diff from
 * @param fromRef the branch or git commit has the diff starts from
 * @param toRef the branch or git commit hash the diff ends at
 * @param files the files to be includedi n the diff (files not part of this array are not included)
 */
export function useGitDiff(url: string, fromRef: string, toRef: string, files: string[]) {
  const fromQuery = useGitRepo(url, fromRef, files)
  const toQuery = useGitRepo(url, toRef, files)

  const patches = useMemo(() => {
    const patches = []
    if (fromQuery.data && toQuery.data) {
      const fromFiles = fromQuery.data
      const toFiles = fromQuery.data

      for (let i = 0;i < fromFiles.length;i++) {
        patches.push(diff.createPatch(files[i], fromFiles[i], toFiles[i]))
      }
    }

    return patches
  }, [fromQuery.data, toQuery.data])

  return {
    patches,
    fromQuery,
    toQuery
  }
}