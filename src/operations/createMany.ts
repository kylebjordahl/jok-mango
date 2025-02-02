import { Db, ObjectId } from 'mongodb'
import { Omit } from '../common/omit'
import { DocumentBase, ID, RepositoryOptions } from '../types'

export default function createManyFn<TDocument extends DocumentBase>(
	db: Db,
	collectionName,
	repositoryOptions?: RepositoryOptions,
) {
	return async function createMany(data: Data<TDocument>[]): Promise<number> {
		if (!data) {
			throw new Error('Invalid argument: data, should be array')
		}

		if (!data.length) {
			return 0
		}

		const now = new Date()

		const docs = data
			.map((x) => <TDocument>x)
			.map(
				(x) => <TDocument>(<any>{
						_id: repositoryOptions?.skipIdTransformations
							? x.id || new ObjectId().toHexString()
							: new ObjectId(x.id || undefined),
						createdAt: x.createdAt || now,
						updatedAt: now,
						deletedAt: undefined,
						version: 1,
						...x,
					}),
			)

		const session =
			(repositoryOptions && repositoryOptions.session) || undefined

		const { result, insertedCount } = await db
			.collection<TDocument>(collectionName)
			.insertMany(docs, { session })

		if (!result.ok || insertedCount !== data.length) {
			throw new Error('CREATE_OPERATION_FAILED')
		}

		if (repositoryOptions && repositoryOptions.logger) {
			const duration = Date.now() - now.getTime()

			repositoryOptions.logger(collectionName, 'createMany', duration)
		}

		return insertedCount
	}
}

type Data<TDocument extends DocumentBase> =
	| Omit<TDocument, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'deletedAt'>
	| { id?: ID }
