import { ChunkExports, ChunkDependencies } from '../../Chunk';

export default function getExportBlock(
	exports: ChunkExports,
	dependencies: ChunkDependencies,
	namedExportsMode: boolean,
	interop: boolean,
	mechanism = 'return'
) {
	if (!namedExportsMode) {
		let local;
		exports.some(expt => {
			if (expt.exported === 'default') {
				local = expt.local;
				return true;
			}
			return false;
		});
		// search for reexported default otherwise
		if (!local) {
			dependencies.some(dep => {
				if (!dep.reexports) return false;
				return dep.reexports.some(expt => {
					if (expt.reexported === 'default') {
						local = dep.namedExportsMode ? `${dep.name}.${expt.imported}` : dep.name;
						return true;
					}
					return false;
				});
			});
		}
		return `${mechanism} ${local};`;
	}

	let exportBlock = '';

	// star exports must always output first for precedence
	dependencies.forEach(({ name, reexports }) => {
		if (reexports && namedExportsMode) {
			reexports.forEach(specifier => {
				if (specifier.reexported === '*') {
					exportBlock += `${
						exportBlock ? '\n' : ''
					}Object.keys(${name}).forEach(function (key) { exports[key] = ${name}[key]; });`;
				}
			});
		}
	});

	dependencies.forEach(({ name, imports, reexports, isChunk }) => {
		if (reexports && namedExportsMode) {
			reexports.forEach(specifier => {
				if (specifier.imported === 'default' && !isChunk) {
					const exportsNamesOrNamespace =
						(imports &&
							imports.some(
								specifier => specifier.imported === '*' || specifier.imported !== 'default'
							)) ||
						(reexports &&
							reexports.some(
								specifier => specifier.imported !== 'default' && specifier.imported !== '*'
							));
					if (exportsNamesOrNamespace) {
						exportBlock += `${exportBlock ? '\n' : ''}exports.${specifier.reexported} = ${name}${
							interop !== false ? '__default' : '.default'
						};`;
					} else {
						exportBlock += `${exportBlock ? '\n' : ''}exports.${specifier.reexported} = ${name};`;
					}
				} else if (specifier.imported !== '*') {
					exportBlock += `${exportBlock ? '\n' : ''}exports.${specifier.reexported} = ${name}.${
						specifier.imported
					};`;
				} else if (specifier.reexported !== '*') {
					exportBlock += `${exportBlock ? '\n' : ''}exports.${specifier.reexported} = ${name};`;
				}
			});
		}
	});

	exports.forEach(expt => {
		const lhs = `exports.${expt.exported}`;
		const rhs = expt.local;
		if (lhs === rhs) {
			return;
		}
		if (exportBlock) {
			exportBlock += '\n';
		}
		exportBlock += `${lhs} = ${rhs};`;
	});

	return exportBlock;
}
