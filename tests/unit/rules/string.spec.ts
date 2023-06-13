/*
 * @vinejs/vine
 *
 * (c) VineJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { validator } from '../../../factories/main.js'
import {
  urlRule,
  regexRule,
  alphaRule,
  emailRule,
  stringRule,
  mobileRule,
  hexCodeRule,
  activeUrlRule,
  alphaNumericRule,
} from '../../../src/schema/string/rules.js'
import type { Validation } from '../../../src/types.js'

type DataSet = {
  errorsCount?: number
  error?: string
  bail?: boolean
  rule: Validation<any>
  value: any
  output?: any
}

/**
 * Helpers to run string schema type validations
 */
async function stringRuleValidator(_: any, dataset: DataSet) {
  const string = stringRule()
  const validated = dataset.rule.rule.isAsync
    ? await validator
        .bail(dataset.bail === false ? false : true)
        .executeAsync([string, dataset.rule], dataset.value)
    : validator
        .bail(dataset.bail === false ? false : true)
        .execute([string, dataset.rule], dataset.value)

  if (dataset.error && dataset.errorsCount) {
    validated.assertErrorsCount(dataset.errorsCount)
    validated.assertError(dataset.error)
  } else {
    validated.assertSucceeded()
    validated.assertOutput(dataset.value)
  }
}

test.group('String | string', () => {
  test('report when value is not a string', () => {
    const string = stringRule()
    const validated = validator.execute(string, 22)

    validated.assertErrorsCount(1)
    validated.assertError('The dummy field must be a string')
  })

  test('pass validation when value is a string', () => {
    const string = stringRule()
    const validated = validator.execute(string, '22')

    validated.assertSucceeded()
    validated.assertOutput('22')
  })
})

test.group('String | email', () => {
  test('validate {value}')
    .with([
      {
        errorsCount: 1,
        rule: emailRule(),
        value: 22,
        error: 'The dummy field must be a string',
      },
      {
        errorsCount: 1,
        rule: emailRule(),
        value: 22,
        bail: false,
        error: 'The dummy field must be a string',
      },
      {
        errorsCount: 1,
        rule: emailRule(),
        value: 'foo',
        error: 'The dummy field must be a valid email address',
      },
      {
        rule: emailRule(),
        value: 'foo@bar.com',
      },
      {
        rule: emailRule({ allow_display_name: true }),
        value: 'Foo <foo@bar.com>',
      },
    ])
    .run(stringRuleValidator)
})

test.group('String | mobile', () => {
  test('validate {value}')
    .with([
      {
        errorsCount: 1,
        rule: mobileRule(),
        value: 22,
        error: 'The dummy field must be a string',
      },
      {
        errorsCount: 1,
        rule: mobileRule(),
        value: 22,
        bail: false,
        error: 'The dummy field must be a string',
      },
      {
        errorsCount: 1,
        rule: mobileRule(),
        value: '20202',
        error: 'The dummy field must be a valid mobile phone number',
      },
      {
        rule: mobileRule(),
        value: '804 225 1616',
      },
      {
        errorsCount: 1,
        rule: mobileRule({ locales: ['en-IN'] }),
        value: '(555) 555-1234',
        error: 'The dummy field must be a valid mobile phone number',
      },
      {
        rule: mobileRule({ locales: ['en-IN'] }),
        value: '9883443344',
      },
      {
        rule: mobileRule({ locales: ['en-IN', 'en-US'] }),
        value: '(555) 555-1234',
      },
      {
        rule: mobileRule({ locales: ['en-IN', 'en-US'] }),
        value: '9883443344',
      },
      {
        rule: mobileRule({ locales: ['en-IN', 'en-US'], strictMode: true }),
        value: '+1 (555) 555-1234',
      },
      {
        rule: mobileRule({ locales: ['en-IN', 'en-US'], strictMode: true }),
        value: '+919883443344',
      },
      {
        rule: mobileRule(() => {
          return { locales: ['en-IN', 'en-US'] }
        }),
        value: '(555) 555-1234',
      },
      {
        rule: mobileRule(() => {
          return { locales: ['en-IN', 'en-US'] }
        }),
        value: '9883443344',
      },
      {
        rule: mobileRule(() => {
          return {}
        }),
        value: '(555) 555-1234',
      },
      {
        rule: mobileRule(() => {
          return {}
        }),
        value: '9883443344',
      },
    ])
    .run(stringRuleValidator)
})

test.group('String | hexCode', () => {
  test('validate {value}')
    .with([
      {
        errorsCount: 1,
        rule: hexCodeRule(),
        value: 22,
        error: 'The dummy field must be a string',
      },
      {
        errorsCount: 1,
        rule: hexCodeRule(),
        value: 22,
        bail: false,
        error: 'The dummy field must be a string',
      },
      {
        errorsCount: 1,
        rule: hexCodeRule(),
        value: 'fff',
        error: 'The dummy field must be a valid hex color code',
      },
      {
        errorsCount: 1,
        rule: hexCodeRule(),
        value: 'red',
        error: 'The dummy field must be a valid hex color code',
      },
      {
        rule: hexCodeRule(),
        value: '#fff',
      },
      {
        rule: hexCodeRule(),
        value: '#ffffff',
      },
    ])
    .run(stringRuleValidator)
})

test.group('String | url', () => {
  test('validate {value}')
    .with([
      {
        errorsCount: 1,
        rule: urlRule(),
        value: 22,
        error: 'The dummy field must be a string',
      },
      {
        errorsCount: 1,
        rule: urlRule(),
        value: 22,
        bail: false,
        error: 'The dummy field must be a string',
      },
      {
        errorsCount: 1,
        rule: urlRule(),
        value: 'foo_bar',
        error: 'The dummy field must be a valid URL',
      },
      {
        errorsCount: 1,
        rule: urlRule({ allow_underscores: false }),
        value: 'https://foo_bar.com',
        error: 'The dummy field must be a valid URL',
      },
      {
        rule: urlRule(),
        value: 'https://google.com',
      },
    ])
    .run(stringRuleValidator)
})

test.group('String | activeUrl', () => {
  test('validate {value}')
    .with([
      {
        errorsCount: 1,
        rule: activeUrlRule(),
        value: 22,
        error: 'The dummy field must be a string',
      },
      {
        errorsCount: 1,
        rule: activeUrlRule(),
        value: 22,
        bail: false,
        error: 'The dummy field must be a string',
      },
      {
        errorsCount: 1,
        rule: activeUrlRule(),
        value: 'foo_bar',
        error: 'The dummy field must be a valid URL',
      },
      {
        errorsCount: 1,
        rule: activeUrlRule(),
        value: 'https://foo.com',
        error: 'The dummy field must be a valid URL',
      },
      {
        rule: activeUrlRule(),
        value: 'https://google.com',
      },
    ])
    .run(stringRuleValidator)
})

test.group('String | regex', () => {
  test('validate {value}')
    .with([
      {
        errorsCount: 1,
        rule: regexRule(/^[a-zA-Z0-9]+$/),
        value: 22,
        error: 'The dummy field must be a string',
      },
      {
        errorsCount: 1,
        rule: regexRule(/^[a-zA-Z0-9]+$/),
        value: 22,
        bail: false,
        error: 'The dummy field must be a string',
      },
      {
        errorsCount: 1,
        rule: regexRule(/^[a-zA-Z0-9]+$/),
        value: 'foo_bar',
        error: 'The dummy field format is invalid',
      },
      {
        rule: regexRule(/^[a-zA-Z0-9]+$/),
        value: 'hello',
      },
      {
        rule: regexRule(/^[a-zA-Z0-9]+$/),
        value: 'hello1234',
      },
      {
        rule: regexRule(new RegExp('^[a-zA-Z0-9]+$')),
        value: 'hello',
      },
    ])
    .run(stringRuleValidator)
})

test.group('String | alpha', () => {
  test('validate {value}')
    .with([
      {
        errorsCount: 1,
        rule: alphaRule(),
        value: 22,
        error: 'The dummy field must be a string',
      },
      {
        errorsCount: 1,
        rule: alphaRule(),
        value: 22,
        bail: false,
        error: 'The dummy field must be a string',
      },
      {
        errorsCount: 1,
        rule: alphaRule(),
        value: 'foo_bar',
        error: 'The dummy field must contain only letters',
      },
      {
        rule: alphaRule(),
        value: 'hello',
      },
      {
        rule: alphaRule({ allowSpaces: true }),
        value: 'hello world',
      },
      {
        rule: alphaRule({ allowUnderscores: true }),
        value: 'hello_world',
      },
      {
        rule: alphaRule({ allowDashes: true }),
        value: 'hello-world',
      },
    ])
    .run(stringRuleValidator)
})

test.group('String | alphaNumeric', () => {
  test('validate {value}')
    .with([
      {
        errorsCount: 1,
        rule: alphaNumericRule(),
        value: 22,
        error: 'The dummy field must be a string',
      },
      {
        errorsCount: 1,
        rule: alphaNumericRule(),
        value: 22,
        bail: false,
        error: 'The dummy field must be a string',
      },
      {
        errorsCount: 1,
        rule: alphaNumericRule(),
        value: 'foo_bar',
        error: 'The dummy field must contain only letters and numbers',
      },
      {
        rule: alphaNumericRule(),
        value: 'hello1244',
      },
      {
        rule: alphaNumericRule({ allowSpaces: true }),
        value: 'hello 1244',
      },
      {
        rule: alphaNumericRule({ allowUnderscores: true }),
        value: 'hello_1244',
      },
      {
        rule: alphaNumericRule({ allowDashes: true }),
        value: 'hello-1244',
      },
    ])
    .run(stringRuleValidator)
})
