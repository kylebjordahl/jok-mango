import { Db, FilterQuery, FindOneAndUpdateOption, UpdateQuery } from 'mongodb'
import { Omit } from '../common/omit'
import transformIdFilter from '../common/transformIdFilter'
import { DocumentBase, RepositoryOptions } from '../types'

export default function updateFn<TDocument extends DocumentBase>(
	db: Db,
	collectionName,
	repositoryOptions?: RepositoryOptions,
) {
	return async function update(
		filter: FilterQuery<TDocument>,
		data: Data<TDocument>,
		options?: FindOneAndUpdateOption & ExtendOptionProps<Data<TDocument>>,
	): Promise<number> {
		const now = new Date()

		const doc: TDocument = <any>data

		doc.updatedAt = now

		const mongoFilter = repositoryOptions && repositoryOptions.skipIdTransformations
			? filter
			: transformIdFilter(filter)

		// remove version from updated fields
		// it will be incremented by one
		delete doc['_id']
		delete doc.id
		delete doc.version
		delete doc.createdAt
		delete doc.deletedAt

		// allow caller to skip version update
		const version = options && options.skipVersionUpdate
			? 1
			: 0

		const updateQuery = options
			? <any>options.updateQuery
			: null

		const {
			result: { ok },
			modifiedCount,
		} = await db.collection<TDocument>(collectionName).updateMany(
			mongoFilter,
			{
				$set: data,
				$inc: { version },
				...updateQuery,
			},
			options,
		)

		if (!ok) {
			throw new Error('UPDATE_DOCUMENTS_FAILED')
		}

		return modifiedCount
	}
}

type Data<TDocument extends DocumentBase> =
	Partial<Omit<TDocument, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'deletedAt'>>

export interface ExtendOptionProps<TDocument> {
	skipVersionUpdate?: boolean
	updateQuery?: UpdateQuery<TDocument>
}
