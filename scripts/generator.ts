import { IObjectType, IArrayType, Type, API, Interface } from './parser'
import { getTpl } from './tpl'

const isObjType = (obj): obj is IObjectType => obj.props
const isArrayType = (obj): obj is IArrayType => obj.type

function typeToSting(type: Type): string {
  if (Array.isArray(type)) {
    return type.map((t) => JSON.stringify(t)).join('|')
  } else if (isArrayType(type)) {
    return `Array<${typeToSting(type.type)}>`
  } else if (isObjType(type)) {
    return `{
        ${type.props
          .map(
            (p) =>
              `${p.name}${p.required ? '' : '?'}: ${
                p.type ? typeToSting(p.type) : 'any'
              }`
          )
          .join('\n')}
      }`
  } else {
    return type
  }
}

export function generateDefinesCode(interfaces: Interface[]) {
  const str = interfaces
    .map((type) => {
      const iType = typeToSting(type.type)

      return `
      export interface ${type.name} ${iType === 'any' ? '{}' : iType}
      `
    })
    .join('\n')

  return [getTpl('comment'), str].join('\n')
}

export function generateAPICode(
  apis: API[],
  opt: {
    header?: string
    footer?: string
  } = {}
) {
  opt = Object.assign(
    {
      header: '',
      footer: ''
    },
    opt
  )

  const allApis = apis.map((api) => {
    const type = api.params
      .map((p) => {
        return `
      /**
       * ${p.desc}
       */
        ${p.name}${p.required ? '' : '?'}: ${
          p.type ? typeToSting(p.type) : 'any'
        }
        `
      })
      .join('\n')

    const resDataType = api.data
    const resType = resDataType ? typeToSting(resDataType) : 'void'

    const methodKey = api.method === 'delete' ? 'remove' : api.method

    const functionName =
      api.path
        .split('/')
        .slice(3)
        .map((n, i) => {
          const name = n.startsWith('{') ? n.slice(1, n.length - 1) : n
          if (i > 0) {
            return name[0].toUpperCase() + name.slice(1)
          } else {
            return name
          }
        })
        .join('')
        .replace(/-\w/g, (c) => c[1].toUpperCase()) +
      methodKey[0].toUpperCase() +
      methodKey.slice(1)

    const isRequired = Object.keys(api.params).reduce(
      (isRequired, key) => isRequired || api.params[key].required,
      false
    )

    const optStr = type ? `opt${isRequired ? '' : '?'}: {${type}}` : ''

    return `
    /**
     * ${api.desc}
     */
      export function ${functionName}(${optStr}): Promise<${resType}> {
        return ${methodKey}('${api.path}', ${optStr ? 'opt' : ''})
      }
      `
  })

  return [
    getTpl('comment'),
    opt.header,
    getTpl('config'),
    allApis.join('\n'),
    opt.footer
  ].join('\n')
}
