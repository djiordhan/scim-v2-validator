'use client';

import { ValidationResult } from '../lib/types';
import TestResultItem from './TestResultItem';

interface Props {
  results: ValidationResult[];
}

export default function TestResults({ results }: Props) {
  return (
    <div className="space-y-3">
      {results.map((result, i) => (
        <TestResultItem key={i} result={result} />
      ))}
    </div>
  );
}
