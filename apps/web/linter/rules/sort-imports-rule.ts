import { Linter } from 'eslint';

const sortImportsRule: Linter.RulesRecord = {
  'sort-imports': [
    'error',
    {
      allowSeparatedGroups: true,
      ignoreCase: true,
      ignoreDeclarationSort: true,
      ignoreMemberSort: false,
      memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
    },
  ],
};

export default sortImportsRule;
