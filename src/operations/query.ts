import { Db, FilterQuery, FindOneOptions } from 'mongodb'
import mapObject from '../common/mapObject'
import transformIdFilter from '../common/transformIdFilter'
import { DocumentBase, RepositoryOptions } from '../types'

export default function queryFn<TDocument extends DocumentBase>(
	db: Db,
	collectionName,
	repositoryOptions?: RepositoryOptions,
) {
	return async function query(
		filterQuery: FilterQuery<TDocument> = {},
		options: FindOneOptions,
	): Promise<TDocument[]> {

		if (repositoryOptions && repositoryOptions.query) {
			if (repositoryOptions.query.defaultLimit) {
				// tslint:disable-next-line
				options = {
					limit: repositoryOptions.query.defaultLimit,
					...options,
				}
			}
		}

		if (repositoryOptions && repositoryOptions.delete) {
			if (repositoryOptions.delete.enableSoftDeleteByDefault) {
				// tslint:disable-next-line
				filterQuery = {
					deletedAt: { $eq: null },
					...filterQuery,
				}
			}
		}

		const mongoFilter = repositoryOptions && repositoryOptions.skipIdTransformations
			? filterQuery
			: transformIdFilter(filterQuery)

		return db.collection(collectionName)
			.find<TDocument>(mongoFilter, options)
			.toArray()
			.then(items => repositoryOptions && repositoryOptions.skipIdTransformations
				? items
				: items
					.map(mapObject)
					.filter(x => !!x)
					.map(x => <TDocument>x),
			)
	}
}
